package collect

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/sys/windows/registry"
	"github.com/uecp/agent-windows/internal/util"
)

// AutorunsInfo содержит информацию об автозапусках
type AutorunsInfo struct {
	Registry        []RegistryAutorun  `json:"registry"`
	StartupFolders  []StartupFolder    `json:"startup_folders"`
	ServicesAuto    []ServiceAutorun   `json:"services_auto"`
	ScheduledTasks  []ScheduledTask    `json:"scheduled_tasks"`
}

// RegistryAutorun представляет автозапуск из реестра
type RegistryAutorun struct {
	Root  string `json:"root"`
	Path  string `json:"path"`
	Name  string `json:"name"`
	Value string `json:"value"`
}

// StartupFolder представляет файл в папке автозагрузки
type StartupFolder struct {
	Location string `json:"location"`
	File     string `json:"file"`
	Target   string `json:"target"`
}

// ServiceAutorun представляет автоматически запускаемый сервис
type ServiceAutorun struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Path        string `json:"path"`
	StartMode   string `json:"start_mode"`
	State       string `json:"state"`
}

// ScheduledTask представляет запланированную задачу
type ScheduledTask struct {
	TaskName string `json:"task_name"`
	RunAs    string `json:"run_as"`
	Trigger  string `json:"trigger"`
	Action   string `json:"action"`
	Status   string `json:"status"`
}

// collectAutoruns собирает информацию об автозапусках
func (c *Collector) collectAutoruns(ctx context.Context) (*AutorunsInfo, error) {
	info := &AutorunsInfo{}

	// Сбор автозапусков из реестра
	registryRuns, err := c.collectRegistryAutoruns(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать автозапуски из реестра: %v", err)
	} else {
		info.Registry = registryRuns
	}

	// Сбор из папок автозагрузки
	startupFolders, err := c.collectStartupFolders(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать файлы автозагрузки: %v", err)
	} else {
		info.StartupFolders = startupFolders
	}

	// Сбор автоматических сервисов
	services, err := c.collectAutoServices(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать автоматические сервисы: %v", err)
	} else {
		info.ServicesAuto = services
	}

	// Сбор запланированных задач
	tasks, err := c.collectScheduledTasks(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать запланированные задачи: %v", err)
	} else {
		info.ScheduledTasks = tasks
	}

	log.Printf("Собрано автозапусков: реестр=%d, папки=%d, сервисы=%d, задачи=%d",
		len(info.Registry), len(info.StartupFolders), len(info.ServicesAuto), len(info.ScheduledTasks))

	return info, nil
}

// collectRegistryAutoruns собирает автозапуски из реестра
func (c *Collector) collectRegistryAutoruns(ctx context.Context) ([]RegistryAutorun, error) {
	var autoruns []RegistryAutorun

	// Ключи реестра для проверки
	registryPaths := []struct {
		root registry.Key
		path string
		name string
	}{
		{registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\Run`, "HKLM"},
		{registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce`, "HKLM"},
		{registry.CURRENT_USER, `SOFTWARE\Microsoft\Windows\CurrentVersion\Run`, "HKCU"},
		{registry.CURRENT_USER, `SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce`, "HKCU"},
	}

	for _, regPath := range registryPaths {
		select {
		case <-ctx.Done():
			return autoruns, ctx.Err()
		default:
		}

		key, err := registry.OpenKey(regPath.root, regPath.path, registry.QUERY_VALUE)
		if err != nil {
			log.Printf("Не удалось открыть ключ реестра %s\\%s: %v", regPath.name, regPath.path, err)
			continue
		}

		valueNames, err := key.ReadValueNames(-1)
		if err != nil {
			key.Close()
			log.Printf("Не удалось прочитать значения из %s\\%s: %v", regPath.name, regPath.path, err)
			continue
		}

		for _, valueName := range valueNames {
			value, _, err := key.GetStringValue(valueName)
			if err != nil {
				continue
			}

			autoruns = append(autoruns, RegistryAutorun{
				Root:  regPath.name,
				Path:  regPath.path,
				Name:  valueName,
				Value: value,
			})
		}

		key.Close()
	}

	return autoruns, nil
}

// collectStartupFolders собирает файлы из папок автозагрузки
func (c *Collector) collectStartupFolders(ctx context.Context) ([]StartupFolder, error) {
	var startupFiles []StartupFolder

	// Папки автозагрузки для проверки
	startupDirs := []string{
		os.Getenv("ProgramData") + `\Microsoft\Windows\Start Menu\Programs\StartUp`,
		os.Getenv("AppData") + `\Microsoft\Windows\Start Menu\Programs\Startup`,
	}

	for _, dir := range startupDirs {
		select {
		case <-ctx.Done():
			return startupFiles, ctx.Err()
		default:
		}

		if _, err := os.Stat(dir); os.IsNotExist(err) {
			continue
		}

		entries, err := os.ReadDir(dir)
		if err != nil {
			log.Printf("Не удалось прочитать папку автозагрузки %s: %v", dir, err)
			continue
		}

		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}

			fileName := entry.Name()
			filePath := filepath.Join(dir, fileName)
			target := ""

			// Для ярлыков пытаемся определить цель
			if strings.HasSuffix(strings.ToLower(fileName), ".lnk") {
				target = c.resolveShortcutTarget(filePath)
			} else {
				target = filePath
			}

			startupFiles = append(startupFiles, StartupFolder{
				Location: dir,
				File:     fileName,
				Target:   target,
			})
		}
	}

	return startupFiles, nil
}

// collectAutoServices собирает автоматически запускаемые сервисы
func (c *Collector) collectAutoServices(ctx context.Context) ([]ServiceAutorun, error) {
	// Используем PowerShell для получения информации о сервисах
	psExecutor := util.NewPowerShellExecutor(30 * time.Second)
	
	services, err := psExecutor.GetAutoServices(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось получить автосервисы: %v", err)
		return []ServiceAutorun{}, nil
	}

	var result []ServiceAutorun
	for _, svc := range services {
		name, _ := svc["Name"].(string)
		displayName, _ := svc["DisplayName"].(string)
		pathName, _ := svc["PathName"].(string)
		state, _ := svc["State"].(string)
		
		result = append(result, ServiceAutorun{
			Name:        name,
			DisplayName: displayName,
			Path:        pathName,
			StartMode:   "Auto",
			State:       state,
		})
	}

	return result, nil
}

// collectScheduledTasks собирает запланированные задачи
func (c *Collector) collectScheduledTasks(ctx context.Context) ([]ScheduledTask, error) {
	psExecutor := util.NewPowerShellExecutor(30 * time.Second)
	
	tasks, err := psExecutor.GetScheduledTasks(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось получить запланированные задачи: %v", err)
		return []ScheduledTask{}, nil
	}

	var result []ScheduledTask
	for _, task := range tasks {
		taskName, _ := task["TaskName"].(string)
		state, _ := task["State"].(string)
		
		// Получаем первое действие если есть
		actions, _ := task["Actions"].([]interface{})
		var action string
		if len(actions) > 0 {
			if actionMap, ok := actions[0].(map[string]interface{}); ok {
				execute, _ := actionMap["Execute"].(string)
				args, _ := actionMap["Arguments"].(string)
				if args != "" {
					action = fmt.Sprintf("%s %s", execute, args)
				} else {
					action = execute
				}
			}
		}
		
		result = append(result, ScheduledTask{
			TaskName: taskName,
			RunAs:    "система", // PowerShell скрипт не возвращает это поле
			Trigger:  "автозапуск",
			Action:   action,
			Status:   state,
		})
	}

	return result, nil
}

// resolveShortcutTarget пытается определить цель ярлыка
func (c *Collector) resolveShortcutTarget(shortcutPath string) string {
	// Упрощенная реализация - для полной поддержки нужна работа с COM
	// Возвращаем путь к самому ярлыку
	return shortcutPath
}
