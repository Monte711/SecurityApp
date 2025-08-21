package collect

import (
	"context"
	"fmt"
	"runtime"

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
	info.OS = OSInfo{
		Name:    getWindowsProductName(),
		Version: hostInfo.PlatformVersion,
		Build:   hostInfo.KernelVersion,
	}

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
