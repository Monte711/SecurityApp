package collect

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/uecp/agent-windows/internal/util"
)

// collectWindowsUpdates собирает информацию об обновлениях Windows
func (c *Collector) collectWindowsUpdates(ctx context.Context) (*WindowsUpdateInfo, error) {
	log.Println("Начинается сбор информации об обновлениях Windows...")

	result := &WindowsUpdateInfo{
		Permission: "granted", // По умолчанию считаем что доступ есть
	}

	psExecutor := util.NewPowerShellExecutor(30 * time.Second)

	// 1. Получаем статус службы Windows Update
	serviceStatus, err := c.getWindowsUpdateServiceStatus(ctx, psExecutor)
	if err != nil {
		log.Printf("Ошибка получения статуса службы обновлений: %v", err)
		result.UpdateServiceStatus = "unknown"
		result.Permission = "denied"
		errorMsg := fmt.Sprintf("Ошибка получения статуса службы: %v", err)
		result.ErrorMessage = &errorMsg
	} else {
		result.UpdateServiceStatus = serviceStatus
	}

	// 2. Получаем дату последнего обновления
	lastUpdateDate, err := c.getLastUpdateDate(ctx, psExecutor)
	if err != nil {
		log.Printf("Ошибка получения даты последнего обновления: %v", err)
		if result.Permission == "granted" {
			result.Permission = "partial"
		}
	} else {
		result.LastUpdateDate = lastUpdateDate
	}

	// 3. Получаем количество ожидающих обновлений
	pendingCount, err := c.getPendingUpdatesCount(ctx, psExecutor)
	if err != nil {
		log.Printf("Ошибка получения количества ожидающих обновлений: %v", err)
		if result.Permission == "granted" {
			result.Permission = "partial"
		}
	} else {
		result.PendingUpdates = pendingCount
	}

	log.Printf("Сбор информации об обновлениях завершен. Статус службы: %s, Права: %s", 
		result.UpdateServiceStatus, result.Permission)

	return result, nil
}

// getWindowsUpdateServiceStatus получает статус службы Windows Update
func (c *Collector) getWindowsUpdateServiceStatus(ctx context.Context, ps *util.PowerShellExecutor) (string, error) {
	script := `
		try {
			# Проверяем службу wuauserv (Windows Update)
			$service = Get-Service -Name "wuauserv" -ErrorAction Stop
			
			$result = @{
				"Status" = $service.Status.ToString()
				"StartType" = $service.StartType.ToString()
			}
			
			$result | ConvertTo-Json -Compress
		} catch {
			Write-Output '{"error": "service_not_found"}'
		}
	`

	var serviceInfo map[string]interface{}
	err := ps.ExecuteScriptAsJSON(ctx, script, &serviceInfo)
	if err != nil {
		return "unknown", fmt.Errorf("ошибка выполнения PowerShell: %w", err)
	}

	if errorVal, exists := serviceInfo["error"]; exists {
		return "unknown", fmt.Errorf("ошибка службы: %v", errorVal)
	}

	status, statusExists := serviceInfo["Status"]
	startType, startTypeExists := serviceInfo["StartType"]

	if !statusExists || !startTypeExists {
		return "unknown", fmt.Errorf("неполная информация о службе")
	}

	// Преобразуем статус в понятный формат
	statusStr := fmt.Sprintf("%v", status)
	startTypeStr := fmt.Sprintf("%v", startType)

	// Определяем итоговый статус
	switch startTypeStr {
	case "Disabled":
		return "Disabled", nil
	case "Manual":
		if statusStr == "Running" {
			return "Running", nil
		}
		return "Stopped", nil
	case "Automatic", "AutomaticDelayedStart":
		if statusStr == "Running" {
			return "Running", nil
		}
		return "Stopped", nil
	default:
		return statusStr, nil
	}
}

// getLastUpdateDate получает дату последнего успешно установленного обновления
func (c *Collector) getLastUpdateDate(ctx context.Context, ps *util.PowerShellExecutor) (*string, error) {
	script := `
		try {
			# Метод 1: Пытаемся использовать Windows Update API через COM
			$updateSession = New-Object -ComObject Microsoft.Update.Session
			$updateSearcher = $updateSession.CreateUpdateSearcher()
			$searchResult = $updateSearcher.Search("IsInstalled=1")
			
			$latestDate = $null
			foreach ($update in $searchResult.Updates) {
				if ($update.LastDeploymentChangeTime) {
					if ($latestDate -eq $null -or $update.LastDeploymentChangeTime -gt $latestDate) {
						$latestDate = $update.LastDeploymentChangeTime
					}
				}
			}
			
			if ($latestDate) {
				$utcDate = $latestDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
				Write-Output $utcDate
			} else {
				# Метод 2: Проверяем журнал событий Windows Update
				$events = Get-WinEvent -FilterHashtable @{LogName='System'; ID=43; StartTime=(Get-Date).AddDays(-90)} -MaxEvents 1 -ErrorAction SilentlyContinue
				if ($events) {
					$utcDate = $events[0].TimeCreated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
					Write-Output $utcDate
				} else {
					Write-Output "no_data"
				}
			}
		} catch {
			Write-Output "no_data"
		}
	`

	output, err := ps.ExecuteScript(ctx, script)
	if err != nil {
		return nil, fmt.Errorf("ошибка выполнения PowerShell: %w", err)
	}

	output = strings.TrimSpace(output)
	if output == "" || output == "no_data" {
		return nil, nil // Возвращаем nil для отсутствующих данных
	}

	// Проверяем что дата в правильном формате ISO8601
	if _, err := time.Parse(time.RFC3339, output); err != nil {
		log.Printf("Предупреждение: некорректный формат даты обновления: %s", output)
		return nil, nil
	}

	return &output, nil
}

// getPendingUpdatesCount получает количество ожидающих обновлений
func (c *Collector) getPendingUpdatesCount(ctx context.Context, ps *util.PowerShellExecutor) (*int, error) {
	script := `
		try {
			# Пытаемся использовать Windows Update API
			$updateSession = New-Object -ComObject Microsoft.Update.Session
			$updateSearcher = $updateSession.CreateUpdateSearcher()
			
			# Ищем важные обновления которые не установлены
			$searchResult = $updateSearcher.Search("IsInstalled=0 and IsHidden=0 and Type='Software'")
			
			if ($searchResult.Updates) {
				$count = $searchResult.Updates.Count
				Write-Output $count
			} else {
				Write-Output "0"
			}
		} catch [System.UnauthorizedAccessException] {
			Write-Output "access_denied"
		} catch [System.Security.SecurityException] {
			Write-Output "access_denied"
		} catch {
			# Попробуем альтернативный метод через PSWindowsUpdate если доступен
			try {
				if (Get-Module -ListAvailable -Name PSWindowsUpdate) {
					Import-Module PSWindowsUpdate -ErrorAction Stop
					$updates = Get-WUList -ErrorAction Stop
					if ($updates) {
						Write-Output $updates.Count
					} else {
						Write-Output "0"
					}
				} else {
					Write-Output "no_data"
				}
			} catch {
				Write-Output "no_data"
			}
		}
	`

	output, err := ps.ExecuteScript(ctx, script)
	if err != nil {
		return nil, fmt.Errorf("ошибка выполнения PowerShell: %w", err)
	}

	output = strings.TrimSpace(output)

	switch output {
	case "access_denied":
		return nil, fmt.Errorf("доступ запрещен")
	case "no_data", "":
		return nil, nil // Возвращаем nil если данные недоступны
	default:
		// Пытаемся преобразовать в число
		count, err := strconv.Atoi(output)
		if err != nil {
			log.Printf("Предупреждение: не удалось преобразовать количество обновлений в число: %s", output)
			return nil, nil
		}
		return &count, nil
	}
}