package collect

import (
	"encoding/json"
)

type AgentPayload struct {
	// ...existing fields...
	WindowsUpdate *WindowsUpdateInfo `json:"windows_update,omitempty"`
}

func CollectAgentPayload() AgentPayload {
	payload := AgentPayload{}
	// ...collect other fields...
	updateInfo := CollectWindowsUpdateInfo()
	payload.WindowsUpdate = &updateInfo
	return payload
}

func MarshalAgentPayload(payload AgentPayload) string {
	b, _ := json.Marshal(payload)
	return string(b)
}
