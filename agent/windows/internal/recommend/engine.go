package recommend

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/uecp/agent-windows/internal/collect"
)

// Engine представляет движок анализа и рекомендаций
type Engine struct {
	rules []Rule
}

// Rule представляет правило анализа
type Rule struct {
	ID       string
	Severity string
	Check    func(*collect.HostPostureData) []collect.Finding
}

// NewEngine создает новый движок рекомендаций
func NewEngine() *Engine {
	engine := &Engine{}
	engine.initializeRules()
	return engine
}

// AnalyzeHostPosture анализирует данные хоста и возвращает рекомендации
func (e *Engine) AnalyzeHostPosture(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	for _, rule := range e.rules {
		ruleFindings := rule.Check(data)
		findings = append(findings, ruleFindings...)
	}

	return findings
}

// initializeRules инициализирует набор правил анализа
func (e *Engine) initializeRules() {
	e.rules = []Rule{
		{
			ID:       "FIREWALL_DISABLED",
			Severity: "high",
			Check:    e.checkFirewallDisabled,
		},
		{
			ID:       "DEFENDER_REALTIME_OFF",
			Severity: "high",
			Check:    e.checkDefenderRealtimeOff,
		},
		{
			ID:       "UAC_DISABLED",
			Severity: "high",
			Check:    e.checkUACDisabled,
		},
		{
			ID:       "RDP_ENABLED_NO_NLA",
			Severity: "high",
			Check:    e.checkRDPEnabledNoNLA,
		},
		{
			ID:       "AUTORUN_UNSIGNED",
			Severity: "medium",
			Check:    e.checkAutorunUnsigned,
		},
		{
			ID:       "AUTORUN_MISSING_FILE",
			Severity: "medium",
			Check:    e.checkAutorunMissingFile,
		},
		{
			ID:       "PROCESS_TEMP_EXEC",
			Severity: "medium",
			Check:    e.checkProcessTempExec,
		},
		{
			ID:       "SMB1_ENABLED",
			Severity: "high",
			Check:    e.checkSMB1Enabled,
		},
		{
			ID:       "BITLOCKER_OFF",
			Severity: "medium",
			Check:    e.checkBitLockerOff,
		},
	}
}

// checkFirewallDisabled проверяет отключенные профили брандмауэра
func (e *Engine) checkFirewallDisabled(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Security == nil || data.Security.Firewall == nil {
		return findings
	}

	firewall := data.Security.Firewall
	
	if firewall.Permission == "denied" {
		return findings // Пропускаем если нет прав
	}

	profiles := map[string]*collect.FirewallProfile{
		"Domain":  firewall.Domain,
		"Private": firewall.Private,
		"Public":  firewall.Public,
	}

	for profileName, profile := range profiles {
		if profile != nil && !profile.Enabled {
			findings = append(findings, collect.Finding{
				RuleID:    "FIREWALL_DISABLED",
				Severity:  "high",
				MessageRu: fmt.Sprintf("Внимание: профиль брандмауэра %s отключён", profileName),
				Evidence:  fmt.Sprintf("Профиль %s: enabled=%t", profileName, profile.Enabled),
			})
		}
	}

	return findings
}

// checkDefenderRealtimeOff проверяет отключенную защиту в реальном времени
func (e *Engine) checkDefenderRealtimeOff(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Security == nil || data.Security.Defender == nil {
		return findings
	}

	defender := data.Security.Defender
	
	if defender.Permission == "denied" {
		return findings
	}

	if !defender.RealtimeEnabled {
		findings = append(findings, collect.Finding{
			RuleID:    "DEFENDER_REALTIME_OFF",
			Severity:  "high",
			MessageRu: "Защита в реальном времени Windows Defender отключена",
			Evidence:  fmt.Sprintf("RealTimeProtectionEnabled=%t", defender.RealtimeEnabled),
		})
	}

	return findings
}

// checkUACDisabled проверяет отключенный UAC
func (e *Engine) checkUACDisabled(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Security == nil || data.Security.UAC == nil {
		return findings
	}

	uac := data.Security.UAC
	
	if uac.Permission == "denied" {
		return findings
	}

	if !uac.Enabled {
		findings = append(findings, collect.Finding{
			RuleID:    "UAC_DISABLED",
			Severity:  "high",
			MessageRu: "Контроль учётных записей пользователей (UAC) отключён",
			Evidence:  fmt.Sprintf("UAC enabled=%t", uac.Enabled),
		})
	}

	return findings
}

// checkRDPEnabledNoNLA проверяет RDP без Network Level Authentication
func (e *Engine) checkRDPEnabledNoNLA(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Security == nil || data.Security.RDP == nil {
		return findings
	}

	rdp := data.Security.RDP
	
	if rdp.Permission == "denied" {
		return findings
	}

	if rdp.Enabled && !rdp.NLA {
		findings = append(findings, collect.Finding{
			RuleID:    "RDP_ENABLED_NO_NLA",
			Severity:  "high",
			MessageRu: "Удалённый рабочий стол включён без проверки подлинности на уровне сети (NLA)",
			Evidence:  fmt.Sprintf("RDP enabled=%t, NLA=%t", rdp.Enabled, rdp.NLA),
		})
	}

	return findings
}

// checkAutorunUnsigned проверяет неподписанные файлы в автозагрузке
func (e *Engine) checkAutorunUnsigned(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Inventory == nil || data.Inventory.Autoruns == nil {
		return findings
	}

	autoruns := data.Inventory.Autoruns

	// Проверка файлов из реестра
	for _, regRun := range autoruns.Registry {
		filePath := e.extractFilePathFromValue(regRun.Value)
		if filePath != "" && e.isFileUnsigned(filePath) {
			findings = append(findings, collect.Finding{
				RuleID:    "AUTORUN_UNSIGNED",
				Severity:  "medium",
				MessageRu: "Обнаружен неподписанный файл в автозагрузке",
				Evidence:  fmt.Sprintf("Реестр %s\\%s: %s -> %s", regRun.Root, regRun.Path, regRun.Name, filePath),
			})
		}
	}

	// Проверка файлов из папок автозагрузки
	for _, startup := range autoruns.StartupFolders {
		if startup.Target != "" && e.isFileUnsigned(startup.Target) {
			findings = append(findings, collect.Finding{
				RuleID:    "AUTORUN_UNSIGNED",
				Severity:  "medium", 
				MessageRu: "Обнаружен неподписанный файл в папке автозагрузки",
				Evidence:  fmt.Sprintf("Папка %s: %s -> %s", startup.Location, startup.File, startup.Target),
			})
		}
	}

	return findings
}

// checkAutorunMissingFile проверяет несуществующие файлы в автозагрузке
func (e *Engine) checkAutorunMissingFile(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Inventory == nil || data.Inventory.Autoruns == nil {
		return findings
	}

	autoruns := data.Inventory.Autoruns

	// Проверка файлов из реестра
	for _, regRun := range autoruns.Registry {
		filePath := e.extractFilePathFromValue(regRun.Value)
		if filePath != "" && !e.fileExists(filePath) {
			findings = append(findings, collect.Finding{
				RuleID:    "AUTORUN_MISSING_FILE",
				Severity:  "medium",
				MessageRu: "Обнаружена ссылка на несуществующий файл в автозагрузке",
				Evidence:  fmt.Sprintf("Реестр %s\\%s: %s -> %s (файл не найден)", regRun.Root, regRun.Path, regRun.Name, filePath),
			})
		}
	}

	return findings
}

// checkProcessTempExec проверяет процессы, запущенные из временных папок
func (e *Engine) checkProcessTempExec(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Inventory == nil {
		return findings
	}

	tempPaths := []string{
		"\\temp\\",
		"\\tmp\\",
		"\\appdata\\local\\temp\\",
		"\\users\\public\\",
	}

	for _, process := range data.Inventory.Processes {
		if process.ExePath == "" {
			continue
		}

		exePath := strings.ToLower(process.ExePath)
		for _, tempPath := range tempPaths {
			if strings.Contains(exePath, tempPath) {
				findings = append(findings, collect.Finding{
					RuleID:    "PROCESS_TEMP_EXEC",
					Severity:  "medium",
					MessageRu: "Обнаружен процесс, запущенный из временной папки",
					Evidence:  fmt.Sprintf("PID %d (%s): %s", process.PID, process.Name, process.ExePath),
				})
				break
			}
		}
	}

	return findings
}

// checkSMB1Enabled проверяет включенный SMBv1
func (e *Engine) checkSMB1Enabled(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Security == nil || data.Security.SMB1 == nil {
		return findings
	}

	smb1 := data.Security.SMB1
	
	if smb1.Permission == "denied" {
		return findings
	}

	if smb1.Enabled {
		findings = append(findings, collect.Finding{
			RuleID:    "SMB1_ENABLED",
			Severity:  "high",
			MessageRu: "Протокол SMBv1 включён (уязвим для атак)",
			Evidence:  fmt.Sprintf("SMB1 enabled=%t", smb1.Enabled),
		})
	}

	return findings
}

// checkBitLockerOff проверяет отключенный BitLocker
func (e *Engine) checkBitLockerOff(data *collect.HostPostureData) []collect.Finding {
	var findings []collect.Finding

	if data.Security == nil || data.Security.BitLocker == nil {
		return findings
	}

	bitlocker := data.Security.BitLocker
	
	if bitlocker.Permission == "denied" {
		return findings
	}

	if !bitlocker.SystemDriveProtected {
		findings = append(findings, collect.Finding{
			RuleID:    "BITLOCKER_OFF",
			Severity:  "medium",
			MessageRu: "BitLocker для системного диска отключён",
			Evidence:  "Системный диск C: не защищён BitLocker",
		})
	}

	return findings
}

// Вспомогательные методы

// extractFilePathFromValue извлекает путь к файлу из значения реестра
func (e *Engine) extractFilePathFromValue(value string) string {
	// Убираем кавычки и аргументы командной строки
	value = strings.Trim(value, "\"")
	
	// Ищем первый пробел (начало аргументов)
	if spaceIndex := strings.Index(value, " "); spaceIndex != -1 {
		value = value[:spaceIndex]
	}

	// Проверяем, что это выглядит как путь к файлу
	if filepath.IsAbs(value) && (strings.HasSuffix(strings.ToLower(value), ".exe") || 
		strings.HasSuffix(strings.ToLower(value), ".com") ||
		strings.HasSuffix(strings.ToLower(value), ".bat") ||
		strings.HasSuffix(strings.ToLower(value), ".cmd")) {
		return value
	}

	return ""
}

// fileExists проверяет существование файла
func (e *Engine) fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// isFileUnsigned проверяет, является ли файл неподписанным
func (e *Engine) isFileUnsigned(path string) bool {
	// Упрощенная проверка - в реальной реализации нужно использовать
	// WinAPI или PowerShell для проверки цифровой подписи
	return false // Пока всегда возвращаем false чтобы не было ложных срабатываний
}
