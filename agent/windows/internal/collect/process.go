package collect

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/shirou/gopsutil/v3/process"
	"github.com/uecp/agent-windows/internal/util"
)

// ProcessInfo содержит информацию о процессе
type ProcessInfo struct {
	PID       int32  `json:"pid"`
	PPID      int32  `json:"ppid"`
	Name      string `json:"name"`
	ExePath   string `json:"exe_path"`
	Cmdline   string `json:"cmdline"`
	Username  string `json:"username"`
	Signature *util.SignatureInfo `json:"signature,omitempty"`
	SHA256    string `json:"sha256,omitempty"`
}

// collectProcesses собирает информацию о запущенных процессах
func (c *Collector) collectProcesses(ctx context.Context) ([]ProcessInfo, error) {
	processes, err := process.ProcessesWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("не удалось получить список процессов: %w", err)
	}

	var result []ProcessInfo
	
	for _, p := range processes {
		select {
		case <-ctx.Done():
			return result, ctx.Err()
		default:
		}

		processInfo := c.collectSingleProcess(p)
		if processInfo != nil {
			result = append(result, *processInfo)
		}
	}

	log.Printf("Собрано информации о %d процессах", len(result))
	return result, nil
}

// collectSingleProcess собирает информацию об одном процессе
func (c *Collector) collectSingleProcess(p *process.Process) *ProcessInfo {
	info := &ProcessInfo{
		PID: p.Pid,
	}

	// Получение PPID
	if ppid, err := p.Ppid(); err == nil {
		info.PPID = ppid
	}

	// Получение имени процесса
	if name, err := p.Name(); err == nil {
		info.Name = name
	}

	// Получение пути к исполняемому файлу
	if exe, err := p.Exe(); err == nil {
		info.ExePath = exe
		
		// Проверка цифровой подписи
		signatureChecker := util.NewSignatureChecker()
		if signature := signatureChecker.CheckSignatureSafe(exe); signature != nil {
			info.Signature = signature
		}

		// Вычисление SHA256 если включено
		if c.collectHashes {
			hashCalculator := util.NewHashCalculator()
			if hash := hashCalculator.CalculateSHA256Safe(exe); hash != "" {
				info.SHA256 = hash
			}
		}
	}

	// Получение командной строки
	if cmdline, err := p.Cmdline(); err == nil {
		info.Cmdline = cmdline
	}

	// Получение пользователя
	if username, err := p.Username(); err == nil {
		info.Username = username
	}

	return info
}

// isProcessSuspicious проверяет, является ли процесс подозрительным
func (c *Collector) isProcessSuspicious(info *ProcessInfo) bool {
	if info.ExePath == "" {
		return false
	}

	// Проверка запуска из временных папок
	exePath := strings.ToLower(info.ExePath)
	suspiciousPaths := []string{
		"\\temp\\",
		"\\tmp\\",
		"\\appdata\\local\\temp\\",
		"\\users\\public\\",
	}

	for _, suspPath := range suspiciousPaths {
		if strings.Contains(exePath, suspPath) {
			return true
		}
	}

	// Проверка отсутствия цифровой подписи для исполняемых файлов в системных папках
	if info.Signature != nil && info.Signature.SignatureStatus != "valid" {
		systemPaths := []string{
			"c:\\windows\\",
			"c:\\program files\\",
			"c:\\program files (x86)\\",
		}

		for _, sysPath := range systemPaths {
			if strings.HasPrefix(exePath, sysPath) {
				return true
			}
		}
	}

	return false
}

// filterProcesses фильтрует процессы по важности
func (c *Collector) filterProcesses(processes []ProcessInfo) []ProcessInfo {
	// В полном режиме возвращаем все процессы
	var result []ProcessInfo
	
	for _, proc := range processes {
		// Исключаем системные процессы с низкими PID (обычно ядро)
		if proc.PID <= 4 {
			continue
		}

		// Включаем все остальные процессы
		result = append(result, proc)
	}

	return result
}
