package collect

import (
	"os/exec"
	"time"
	"strings"
	"encoding/json"
)

type WindowsUpdateInfo struct {
	LastUpdateDate     string `json:"last_update_date"`
	UpdateServiceStatus string `json:"update_service_status"`
	PendingUpdates     interface{} `json:"pending_updates"`
}

func CollectWindowsUpdateInfo() WindowsUpdateInfo {
	info := WindowsUpdateInfo{
		LastUpdateDate: "no_data",
		UpdateServiceStatus: "no_data",
		PendingUpdates: "no_data",
	}

	// Get Windows Update service status
	status, err := getServiceStatus("wuauserv")
	if err != nil {
		info.UpdateServiceStatus = "no_data"
	} else {
		info.UpdateServiceStatus = status
	}

	// Get last update date
	lastDate, err := getLastUpdateDate()
	if err != nil {
		info.LastUpdateDate = "no_data"
	} else {
		info.LastUpdateDate = lastDate
	}

	// Get pending updates
	pending, err := getPendingUpdates()
	if err != nil {
		if err.Error() == "denied" {
			info.PendingUpdates = "denied"
		} else {
			info.PendingUpdates = "no_data"
		}
	} else {
		info.PendingUpdates = pending
	}

	return info
}

func getServiceStatus(service string) (string, error) {
	cmd := exec.Command("powershell", "-Command", "Get-Service -Name "+service+" | Select-Object -ExpandProperty Status")
	out, err := cmd.Output()
	if err != nil {
		return "no_data", err
	}
	status := strings.TrimSpace(string(out))
	if status == "Running" {
		return "Running", nil
	} else if status == "Stopped" {
		return "Stopped", nil
	} else if status == "Disabled" {
		return "Disabled", nil
	}
	return status, nil
}

func getLastUpdateDate() (string, error) {
	cmd := exec.Command("powershell", "-Command", "(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn")
	out, err := cmd.Output()
	if err != nil {
		return "no_data", err
	}
	dateStr := strings.TrimSpace(string(out))
	if dateStr == "" {
		return "no_data", nil
	}
	// Try to parse and convert to ISO8601 UTC
	layout := "01/02/2006 15:04:05"
	t, err := time.Parse(layout, dateStr+" 00:00:00")
	if err != nil {
		// Try alternative format
		layout2 := "01/02/2006"
		t, err = time.Parse(layout2, dateStr)
		if err != nil {
			return "no_data", err
		}
		return t.UTC().Format(time.RFC3339), nil
	}
	return t.UTC().Format(time.RFC3339), nil
}

func getPendingUpdates() (int, error) {
	cmd := exec.Command("powershell", "-Command", "Try { (New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search('IsInstalled=0').Updates.Count } Catch { 'denied' }")
	out, err := cmd.Output()
	if err != nil {
		return 0, err
	}
	result := strings.TrimSpace(string(out))
	if result == "denied" {
		return 0, &DeniedError{}
	}
	if result == "" {
		return 0, nil
	}
	var count int
	_, err = fmt.Sscanf(result, "%d", &count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

type DeniedError struct{}
func (e *DeniedError) Error() string { return "denied" }

// Example usage
func CollectAndMarshalWindowsUpdateInfo() string {
	info := CollectWindowsUpdateInfo()
	b, _ := json.Marshal(info)
	return string(b)
}
