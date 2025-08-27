package collect

import (
	"context"
	"fmt"
	"log"
	"time"

	"golang.org/x/sys/windows/registry"
	"github.com/uecp/agent-windows/internal/util"
)

// SecurityInfo содержит информацию о параметрах безопасности
type SecurityInfo struct {
	Defender  *DefenderInfo  `json:"defender"`
	Firewall  *FirewallInfo  `json:"firewall"`
	UAC       *UACInfo       `json:"uac"`
	RDP       *RDPInfo       `json:"rdp"`
	BitLocker *BitLockerInfo `json:"bitlocker"`
	SMB1      *SMB1Info      `json:"smb1"`
}

// DefenderInfo содержит информацию о Windows Defender
type DefenderInfo struct {
	RealtimeEnabled  bool   `json:"realtime_enabled"`
	AntivirusEnabled bool   `json:"antivirus_enabled"`
	EngineVersion    string `json:"engine_version"`
	SignatureAgeDays int    `json:"signature_age_days"`
	Permission       string `json:"permission,omitempty"`
}

// FirewallInfo содержит информацию о состоянии брандмауэра
type FirewallInfo struct {
	Domain  *FirewallProfile `json:"domain"`
	Private *FirewallProfile `json:"private"`
	Public  *FirewallProfile `json:"public"`
	Permission string         `json:"permission,omitempty"`
}

// FirewallProfile представляет профиль брандмауэра
type FirewallProfile struct {
	Enabled           bool   `json:"enabled"`
	DefaultInbound    string `json:"default_inbound"`
}

// UACInfo содержит информацию о User Account Control
type UACInfo struct {
	Enabled    bool   `json:"enabled"`
	Permission string `json:"permission,omitempty"`
}

// RDPInfo содержит информацию о Remote Desktop Protocol
type RDPInfo struct {
	Enabled    bool   `json:"enabled"`
	NLA        bool   `json:"nla"`
	Permission string `json:"permission,omitempty"`
}

// BitLockerInfo содержит информацию о BitLocker
type BitLockerInfo struct {
	SystemDriveProtected bool              `json:"system_drive_protected"`
	Volumes              map[string]Volume `json:"volumes,omitempty"`
	Permission           string            `json:"permission,omitempty"`
	
	// Обратная совместимость со старым API
	Enabled              *bool             `json:"enabled,omitempty"`
}

// Volume представляет информацию о томе BitLocker
type Volume struct {
	ProtectionStatus      string  `json:"protection_status"`
	EncryptionPercentage  float64 `json:"encryption_percentage"`
	ConversionStatus      int     `json:"conversion_status,omitempty"`
}

// SMB1Info содержит информацию о SMBv1
type SMB1Info struct {
	Enabled    bool   `json:"enabled"`
	Permission string `json:"permission,omitempty"`
}

// collectSecurity собирает информацию о параметрах безопасности
func (c *Collector) collectSecurity(ctx context.Context) (*SecurityInfo, error) {
	info := &SecurityInfo{}

	// Сбор информации о Defender
	defender, err := c.collectDefenderInfo(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать информацию о Defender: %v", err)
		info.Defender = &DefenderInfo{Permission: "denied"}
	} else {
		info.Defender = defender
	}

	// Сбор информации о брандмауэре
	firewall, err := c.collectFirewallInfo(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать информацию о брандмауэре: %v", err)
		info.Firewall = &FirewallInfo{Permission: "denied"}
	} else {
		info.Firewall = firewall
	}

	// Сбор информации о UAC
	uac, err := c.collectUACInfo(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать информацию о UAC: %v", err)
		info.UAC = &UACInfo{Permission: "denied"}
	} else {
		info.UAC = uac
	}

	// Сбор информации о RDP
	rdp, err := c.collectRDPInfo(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать информацию о RDP: %v", err)
		info.RDP = &RDPInfo{Permission: "denied"}
	} else {
		info.RDP = rdp
	}

	// Сбор информации о BitLocker
	bitlocker, err := c.collectBitLockerInfo(ctx)
	if err != nil {
		log.Printf("Ошибка BitLocker: %v", err)
		info.BitLocker = &BitLockerInfo{Permission: "denied"}
	} else {
		log.Printf("BitLocker собран успешно: %+v", bitlocker)
		info.BitLocker = bitlocker
	}

	// Сбор информации о SMB1
	smb1, err := c.collectSMB1Info(ctx)
	if err != nil {
		log.Printf("Предупреждение: не удалось собрать информацию о SMB1: %v", err)
		info.SMB1 = &SMB1Info{Permission: "denied"}
	} else {
		info.SMB1 = smb1
	}

	return info, nil
}

// collectDefenderInfo собирает информацию о Windows Defender
func (c *Collector) collectDefenderInfo(ctx context.Context) (*DefenderInfo, error) {
	psExecutor := util.NewPowerShellExecutor(30 * time.Second)
	
	defenderData, err := psExecutor.GetWindowsDefenderStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("не удалось получить статус Defender: %w", err)
	}

	// Проверяем на ошибку доступа
	if errorMsg, hasError := defenderData["error"]; hasError && errorMsg == "permission_denied" {
		return nil, fmt.Errorf("недостаточно прав для проверки Defender")
	}

	realtimeEnabled, _ := defenderData["RealTimeProtectionEnabled"].(bool)
	antivirusEnabled, _ := defenderData["AntivirusEnabled"].(bool)
	quickScanAge, _ := defenderData["QuickScanAge"].(float64)

	return &DefenderInfo{
		RealtimeEnabled:  realtimeEnabled,
		AntivirusEnabled: antivirusEnabled,
		EngineVersion:    "неизвестно",
		SignatureAgeDays: int(quickScanAge),
	}, nil
}

// collectFirewallInfo собирает информацию о брандмауэре
func (c *Collector) collectFirewallInfo(ctx context.Context) (*FirewallInfo, error) {
	psExecutor := util.NewPowerShellExecutor(30 * time.Second)
	
	firewallData, err := psExecutor.GetFirewallStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("не удалось получить статус брандмауэра: %w", err)
	}

	// Проверяем на ошибку доступа
	if errorMsg, hasError := firewallData["error"]; hasError && errorMsg == "permission_denied" {
		return nil, fmt.Errorf("недостаточно прав для проверки брандмауэра")
	}

	firewall := &FirewallInfo{}

	// Получаем статус профилей
	if domainProfile, ok := firewallData["Domain"].(map[string]interface{}); ok {
		if enabled, ok := domainProfile["Enabled"].(bool); ok {
			defaultInbound, _ := domainProfile["DefaultInboundAction"].(string)
			firewall.Domain = &FirewallProfile{
				Enabled:        enabled,
				DefaultInbound: defaultInbound,
			}
		}
	}

	if privateProfile, ok := firewallData["Private"].(map[string]interface{}); ok {
		if enabled, ok := privateProfile["Enabled"].(bool); ok {
			defaultInbound, _ := privateProfile["DefaultInboundAction"].(string)
			firewall.Private = &FirewallProfile{
				Enabled:        enabled,
				DefaultInbound: defaultInbound,
			}
		}
	}

	if publicProfile, ok := firewallData["Public"].(map[string]interface{}); ok {
		if enabled, ok := publicProfile["Enabled"].(bool); ok {
			defaultInbound, _ := publicProfile["DefaultInboundAction"].(string)
			firewall.Public = &FirewallProfile{
				Enabled:        enabled,
				DefaultInbound: defaultInbound,
			}
		}
	}

	return firewall, nil
}

// collectUACInfo собирает информацию о UAC
func (c *Collector) collectUACInfo(ctx context.Context) (*UACInfo, error) {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System`, registry.QUERY_VALUE)
	if err != nil {
		return nil, fmt.Errorf("не удалось открыть ключ реестра UAC: %w", err)
	}
	defer key.Close()

	enableLUA, _, err := key.GetIntegerValue("EnableLUA")
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать значение EnableLUA: %w", err)
	}

	return &UACInfo{
		Enabled: enableLUA != 0,
	}, nil
}

// collectRDPInfo собирает информацию о RDP
func (c *Collector) collectRDPInfo(ctx context.Context) (*RDPInfo, error) {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE,
		`SYSTEM\CurrentControlSet\Control\Terminal Server`, registry.QUERY_VALUE)
	if err != nil {
		return nil, fmt.Errorf("не удалось открыть ключ реестра Terminal Server: %w", err)
	}
	defer key.Close()

	// fDenyTSConnections: 0 = RDP включен, 1 = RDP отключен
	denyConnections, _, err := key.GetIntegerValue("fDenyTSConnections")
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать значение fDenyTSConnections: %w", err)
	}

	rdpInfo := &RDPInfo{
		Enabled: denyConnections == 0,
	}

	// Проверка NLA (Network Level Authentication)
	if rdpInfo.Enabled {
		nlaKey, err := registry.OpenKey(registry.LOCAL_MACHINE,
			`SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp`, registry.QUERY_VALUE)
		if err == nil {
			userAuth, _, err := nlaKey.GetIntegerValue("UserAuthentication")
			if err == nil {
				rdpInfo.NLA = userAuth != 0
			}
			nlaKey.Close()
		}
	}

	return rdpInfo, nil
}

// collectBitLockerInfo собирает информацию о BitLocker
func (c *Collector) collectBitLockerInfo(ctx context.Context) (*BitLockerInfo, error) {
	psExecutor := util.NewPowerShellExecutor(30 * time.Second)
	
	bitlockerData, err := psExecutor.GetBitLockerStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("не удалось получить статус BitLocker: %w", err)
	}

	// Проверяем на ошибку доступа
	if errorMsg, hasError := bitlockerData["error"]; hasError && errorMsg == "permission_denied" {
		return nil, fmt.Errorf("недостаточно прав для проверки BitLocker")
	}

	// Инициализируем структуру
	bitlocker := &BitLockerInfo{
		SystemDriveProtected: false,
		Volumes:              make(map[string]Volume),
	}

	// Обрабатываем все найденные тома
	encryptedVolumes := 0
	totalVolumes := 0
	
	for mountPoint, volumeData := range bitlockerData {
		if volumeInfo, ok := volumeData.(map[string]interface{}); ok {
			totalVolumes++
			protectionStatus, _ := volumeInfo["ProtectionStatus"].(string)
			encryptionPercentage, _ := volumeInfo["EncryptionPercentage"].(float64)
			conversionStatus, _ := volumeInfo["ConversionStatus"].(float64)

			volume := Volume{
				ProtectionStatus:     protectionStatus,
				EncryptionPercentage: encryptionPercentage,
				ConversionStatus:     int(conversionStatus),
			}

			bitlocker.Volumes[mountPoint] = volume

			// Проверяем системный диск C:
			if mountPoint == "C:" {
				bitlocker.SystemDriveProtected = (protectionStatus == "Protected")
			}
			
			// Считаем зашифрованные тома
			if protectionStatus == "Protected" {
				encryptedVolumes++
			}
		}
	}

	// Устанавливаем поле enabled для обратной совместимости
	// true если хотя бы один том зашифрован
	enabled := encryptedVolumes > 0
	bitlocker.Enabled = &enabled

	return bitlocker, nil
}

// collectSMB1Info собирает информацию о SMB1
func (c *Collector) collectSMB1Info(ctx context.Context) (*SMB1Info, error) {
	psExecutor := util.NewPowerShellExecutor(30 * time.Second)
	
	smb1Data, err := psExecutor.GetSMB1Status(ctx)
	if err != nil {
		return nil, fmt.Errorf("не удалось получить статус SMB1: %w", err)
	}

	// Проверяем на ошибку доступа
	if errorMsg, hasError := smb1Data["error"]; hasError && errorMsg == "permission_denied" {
		return nil, fmt.Errorf("недостаточно прав для проверки SMB1")
	}

	serverEnabled, _ := smb1Data["SMB1ServerEnabled"].(bool)
	clientEnabled, _ := smb1Data["SMB1ClientEnabled"].(bool)
	
	// SMB1 включен если включен сервер или клиент
	enabled := serverEnabled || clientEnabled

	return &SMB1Info{
		Enabled: enabled,
	}, nil
}
