package collect

import (
	"context"
	"fmt"
	"log"
	"runtime"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/v3/host"
	"golang.org/x/sys/windows/registry"
)

// SystemInfo содержит информацию о системе
type SystemInfo struct {
	HostID        string `json:"host_id"`
	Hostname      string `json:"hostname"`
	OS            OSInfo `json:"os"`
	UptimeSeconds uint64 `json:"uptime_seconds"`
}

// OSInfo содержит информацию об операционной системе
type OSInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Build   string `json:"build"`
}

// AgentInfo содержит информацию об агенте
type AgentInfo struct {
	AgentID      string `json:"agent_id"`
	AgentVersion string `json:"agent_version"`
}

// WindowsUpdateInfo содержит информацию об обновлениях Windows
type WindowsUpdateInfo struct {
	LastUpdateDate      *string `json:"last_update_date"`       // ISO8601 UTC или null
	UpdateServiceStatus string  `json:"update_service_status"`  // Running/Stopped/Disabled
	PendingUpdates      *int    `json:"pending_updates"`        // количество или null
	Permission          string  `json:"permission"`             // granted/denied/partial
	ErrorMessage        *string `json:"error_message"`          // описание ошибки если есть
}

// collectSystemInfo собирает информацию о системе
func (c *Collector) collectSystemInfo(ctx context.Context) (*SystemInfo, error) {
	info := &SystemInfo{}

	// Получение Host ID из реестра
	hostID, err := getHostIDFromRegistry()
	if err != nil {
		return nil, fmt.Errorf("не удалось получить Host ID: %w", err)
	}
	info.HostID = hostID

	// Информация о хосте через gopsutil
	hostInfo, err := host.InfoWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("не удалось получить информацию о хосте: %w", err)
	}

	info.Hostname = hostInfo.Hostname
	info.UptimeSeconds = hostInfo.Uptime
	
	// Детализированная информация об ОС
	osInfo := getEnhancedWindowsInfo(hostInfo.PlatformVersion, hostInfo.KernelVersion)
	info.OS = osInfo

	return info, nil
}

// getHostIDFromRegistry извлекает уникальный идентификатор машины из реестра
func getHostIDFromRegistry() (string, error) {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, 
		`SOFTWARE\Microsoft\Cryptography`, registry.QUERY_VALUE)
	if err != nil {
		return "", fmt.Errorf("не удалось открыть ключ реестра: %w", err)
	}
	defer key.Close()

	hostID, _, err := key.GetStringValue("MachineGuid")
	if err != nil {
		return "", fmt.Errorf("не удалось прочитать MachineGuid: %w", err)
	}

	return hostID, nil
}

// getWindowsProductName получает название продукта Windows
func getWindowsProductName() string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE,
		`SOFTWARE\Microsoft\Windows NT\CurrentVersion`, registry.QUERY_VALUE)
	if err != nil {
		return "Windows " + runtime.GOOS
	}
	defer key.Close()

	productName, _, err := key.GetStringValue("ProductName")
	if err != nil {
		return "Windows " + runtime.GOOS
	}

	return productName
}

// getEnhancedWindowsInfo получает улучшенную информацию о Windows с корректным определением версии
func getEnhancedWindowsInfo(platformVersion, kernelVersion string) OSInfo {
	// Получаем базовое название продукта из реестра
	baseProductName := getWindowsProductName()
	
	// Извлекаем редакцию (Pro, Home, Enterprise и т.д.)
	edition := extractWindowsEdition(baseProductName)
	
	// Определяем версию Windows по номеру билда
	windowsVersion := determineWindowsVersionByBuild(kernelVersion)
	
	// Формируем итоговое название
	var finalName string
	if windowsVersion == "Неизвестная версия Windows" {
		finalName = baseProductName
		// Логируем для дальнейшей доработки
		log.Printf("ПРЕДУПРЕЖДЕНИЕ: Неизвестная версия Windows. Build: %s, Platform: %s, Product: %s", 
			kernelVersion, platformVersion, baseProductName)
	} else {
		if edition != "" {
			finalName = fmt.Sprintf("%s %s (Build %s)", windowsVersion, edition, extractBuildNumber(kernelVersion))
		} else {
			finalName = fmt.Sprintf("%s (Build %s)", windowsVersion, extractBuildNumber(kernelVersion))
		}
	}
	
	return OSInfo{
		Name:    finalName,
		Version: platformVersion,
		Build:   kernelVersion,
	}
}

// determineWindowsVersionByBuild определяет версию Windows по номеру билда
func determineWindowsVersionByBuild(kernelVersion string) string {
	buildNumber := extractBuildNumber(kernelVersion)
	if buildNumber == "" {
		return "Неизвестная версия Windows"
	}
	
	// Преобразуем в число для сравнения
	build, err := strconv.Atoi(buildNumber)
	if err != nil {
		log.Printf("Не удалось преобразовать номер билда в число: %s", buildNumber)
		return "Неизвестная версия Windows"
	}
	
	// Применяем правила определения версии
	if build >= 10240 && build <= 19045 {
		return "Windows 10"
	} else if build >= 22000 {
		return "Windows 11"
	} else {
		log.Printf("Номер билда %d не попадает в известные диапазоны", build)
		return "Неизвестная версия Windows"
	}
}

// extractBuildNumber извлекает номер билда из строки версии ядра
func extractBuildNumber(kernelVersion string) string {
	// Примеры форматов: "10.0.26100.4946", "10.0.19045.5011"
	parts := strings.Split(kernelVersion, ".")
	if len(parts) >= 3 {
		return parts[2] // Возвращаем третью часть (номер билда)
	}
	return ""
}

// extractWindowsEdition извлекает редакцию Windows из названия продукта
func extractWindowsEdition(productName string) string {
	// Удаляем "Windows 10", "Windows 11" и другие версии из названия
	productName = strings.ReplaceAll(productName, "Windows 10", "")
	productName = strings.ReplaceAll(productName, "Windows 11", "")
	productName = strings.ReplaceAll(productName, "Windows", "")
	
	// Убираем лишние пробелы
	edition := strings.TrimSpace(productName)
	
	// Если ничего не осталось, возвращаем пустую строку
	if edition == "" {
		return ""
	}
	
	return edition
}
