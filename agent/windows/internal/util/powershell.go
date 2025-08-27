package util

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// PowerShellExecutor выполняет PowerShell команды
type PowerShellExecutor struct {
	timeout time.Duration
}

// NewPowerShellExecutor создает новый исполнитель PowerShell
func NewPowerShellExecutor(timeout time.Duration) *PowerShellExecutor {
	return &PowerShellExecutor{
		timeout: timeout,
	}
}

// ExecuteScript выполняет PowerShell скрипт и возвращает результат
func (ps *PowerShellExecutor) ExecuteScript(ctx context.Context, script string) (string, error) {
	// Создание контекста с таймаутом
	ctxWithTimeout, cancel := context.WithTimeout(ctx, ps.timeout)
	defer cancel()

	// Создание команды PowerShell
	cmd := exec.CommandContext(ctxWithTimeout, "powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script)

	// Выполнение команды
	output, err := cmd.Output()
	if err != nil {
		// Попытка получить stderr если доступно
		if exitError, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("ошибка выполнения PowerShell: %s, stderr: %s", err, string(exitError.Stderr))
		}
		return "", fmt.Errorf("ошибка выполнения PowerShell: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}

// ExecuteScriptAsJSON выполняет скрипт и парсит результат как JSON
func (ps *PowerShellExecutor) ExecuteScriptAsJSON(ctx context.Context, script string, result interface{}) error {
	output, err := ps.ExecuteScript(ctx, script)
	if err != nil {
		return err
	}

	if output == "" {
		return fmt.Errorf("пустой ответ от PowerShell")
	}

	err = json.Unmarshal([]byte(output), result)
	if err != nil {
		return fmt.Errorf("ошибка парсинга JSON ответа: %w, output: %s", err, output)
	}

	return nil
}

// GetWindowsDefenderStatus возвращает статус Windows Defender
func (ps *PowerShellExecutor) GetWindowsDefenderStatus(ctx context.Context) (map[string]interface{}, error) {
	script := `
		try {
			$status = Get-MpComputerStatus -ErrorAction Stop
			$prefs = Get-MpPreference -ErrorAction Stop
			
			$result = @{
				"RealTimeProtectionEnabled" = $status.RealTimeProtectionEnabled
				"OnAccessProtectionEnabled" = $status.OnAccessProtectionEnabled
				"AntivirusEnabled" = $status.AntivirusEnabled
				"AMServiceEnabled" = $status.AMServiceEnabled
				"QuickScanAge" = $status.QuickScanAge
				"FullScanAge" = $status.FullScanAge
				"DisableRealtimeMonitoring" = $prefs.DisableRealtimeMonitoring
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '{"error": "permission_denied"}'
		}
	`

	var result map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}

// GetFirewallStatus возвращает статус Windows Firewall
func (ps *PowerShellExecutor) GetFirewallStatus(ctx context.Context) (map[string]interface{}, error) {
	script := `
		try {
			$profiles = Get-NetFirewallProfile -ErrorAction Stop
			$result = @{}
			
			foreach ($profile in $profiles) {
				$result[$profile.Name] = @{
					"Enabled" = [bool]$profile.Enabled
					"DefaultInboundAction" = $profile.DefaultInboundAction.ToString()
					"DefaultOutboundAction" = $profile.DefaultOutboundAction.ToString()
				}
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '{"error": "permission_denied"}'
		}
	`

	var result map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}

// GetUACStatus возвращает статус User Account Control
func (ps *PowerShellExecutor) GetUACStatus(ctx context.Context) (map[string]interface{}, error) {
	script := `
		try {
			$uacKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
			$enableLUA = Get-ItemProperty -Path $uacKey -Name "EnableLUA" -ErrorAction Stop
			$consentPromptBehaviorAdmin = Get-ItemProperty -Path $uacKey -Name "ConsentPromptBehaviorAdmin" -ErrorAction SilentlyContinue
			$promptOnSecureDesktop = Get-ItemProperty -Path $uacKey -Name "PromptOnSecureDesktop" -ErrorAction SilentlyContinue
			
			$result = @{
				"EnableLUA" = $enableLUA.EnableLUA
				"ConsentPromptBehaviorAdmin" = if ($consentPromptBehaviorAdmin) { $consentPromptBehaviorAdmin.ConsentPromptBehaviorAdmin } else { $null }
				"PromptOnSecureDesktop" = if ($promptOnSecureDesktop) { $promptOnSecureDesktop.PromptOnSecureDesktop } else { $null }
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '{"error": "permission_denied"}'
		}
	`

	var result map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}

// GetRDPStatus возвращает статус Remote Desktop
func (ps *PowerShellExecutor) GetRDPStatus(ctx context.Context) (map[string]interface{}, error) {
	script := `
		try {
			$rdpKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server"
			$rdpEnabled = Get-ItemProperty -Path $rdpKey -Name "fDenyTSConnections" -ErrorAction Stop
			
			$nlaKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp"
			$nlaEnabled = Get-ItemProperty -Path $nlaKey -Name "UserAuthentication" -ErrorAction SilentlyContinue
			
			$result = @{
				"RDPEnabled" = ($rdpEnabled.fDenyTSConnections -eq 0)
				"NLAEnabled" = if ($nlaEnabled) { $nlaEnabled.UserAuthentication -eq 1 } else { $null }
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '{"error": "permission_denied"}'
		}
	`

	var result map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}

// GetBitLockerStatus возвращает статус BitLocker
func (ps *PowerShellExecutor) GetBitLockerStatus(ctx context.Context) (map[string]interface{}, error) {
	script := `
		try {
			# Попробуем использовать WMI напрямую
			$volumes = Get-WmiObject -Namespace "Root\cimv2\security\microsoftvolumeencryption" -Class "Win32_EncryptableVolume" -ErrorAction Stop
			$result = @{}
			
			foreach ($volume in $volumes) {
				$driveLetter = $volume.DriveLetter
				if ($driveLetter) {
					$protectionStatus = switch ($volume.ProtectionStatus) {
						0 { "Unprotected" }
						1 { "Protected" }
						2 { "Unknown" }
						default { "Unknown" }
					}
					
					$result[$driveLetter] = @{
						"ProtectionStatus" = $protectionStatus
						"EncryptionPercentage" = if ($volume.EncryptionPercentage) { $volume.EncryptionPercentage } else { 0 }
						"ConversionStatus" = if ($volume.ConversionStatus) { $volume.ConversionStatus } else { 0 }
					}
				}
			}
			
			# Если WMI не дал результатов, попробуем manage-bde
			if ($result.Count -eq 0) {
				$manageOutput = & manage-bde.exe -status C: 2>$null
				if ($LASTEXITCODE -eq 0) {
					$isEncrypted = $manageOutput | Select-String "Protection Status:" | ForEach-Object { $_.Line -match "Protection On" }
					$result["C:"] = @{
						"ProtectionStatus" = if ($isEncrypted) { "Protected" } else { "Unprotected" }
						"EncryptionPercentage" = 0
						"ConversionStatus" = 0
					}
				}
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '{"error": "permission_denied"}'
		}
	`

	var result map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}

// GetSMB1Status возвращает статус SMB1
func (ps *PowerShellExecutor) GetSMB1Status(ctx context.Context) (map[string]interface{}, error) {
	script := `
		try {
			$smb1Server = Get-SmbServerConfiguration -ErrorAction Stop | Select-Object EnableSMB1Protocol
			$smb1Client = Get-WindowsOptionalFeature -Online -FeatureName "SMB1Protocol-Client" -ErrorAction SilentlyContinue
			
			$result = @{
				"SMB1ServerEnabled" = $smb1Server.EnableSMB1Protocol
				"SMB1ClientEnabled" = if ($smb1Client) { $smb1Client.State -eq "Enabled" } else { $null }
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '{"error": "permission_denied"}'
		}
	`

	var result map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}

// GetAutoServices возвращает список автоматически запускаемых служб
func (ps *PowerShellExecutor) GetAutoServices(ctx context.Context) ([]map[string]interface{}, error) {
	script := `
		try {
			$services = Get-WmiObject -Class Win32_Service -Filter "StartMode='Auto'" -ErrorAction Stop | 
				Select-Object Name, DisplayName, PathName, StartName, State
			
			$result = @()
			foreach ($service in $services) {
				$result += @{
					"Name" = $service.Name
					"DisplayName" = $service.DisplayName
					"PathName" = $service.PathName
					"StartName" = $service.StartName
					"State" = $service.State
				}
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '[]'
		}
	`

	var result []map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}

// GetScheduledTasks возвращает список активных запланированных задач
func (ps *PowerShellExecutor) GetScheduledTasks(ctx context.Context) ([]map[string]interface{}, error) {
	script := `
		try {
			$tasks = Get-ScheduledTask -ErrorAction Stop | 
				Where-Object { $_.State -eq "Ready" -and $_.Principal.UserId -ne "SYSTEM" } |
				Select-Object TaskName, TaskPath, State, Actions
			
			$result = @()
			foreach ($task in $tasks) {
				$actions = @()
				if ($task.Actions) {
					foreach ($action in $task.Actions) {
						$actions += @{
							"Execute" = $action.Execute
							"Arguments" = $action.Arguments
							"WorkingDirectory" = $action.WorkingDirectory
						}
					}
				}
				
				$result += @{
					"TaskName" = $task.TaskName
					"TaskPath" = $task.TaskPath
					"State" = $task.State.ToString()
					"Actions" = $actions
				}
			}
			
			$result | ConvertTo-Json -Compress -Depth 3
		} catch {
			Write-Output '[]'
		}
	`

	var result []map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &result)
	return result, err
}
