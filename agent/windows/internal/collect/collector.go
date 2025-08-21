package collect

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Collector представляет основной коллектор данных
type Collector struct {
	collectHashes bool
}

// NewCollector создает новый экземпляр коллектора
func NewCollector(collectHashes bool) *Collector {
	return &Collector{
		collectHashes: collectHashes,
	}
}

// HostPostureData представляет полные данные о состоянии хоста
type HostPostureData struct {
	EventID   string        `json:"event_id"`
	EventType string        `json:"event_type"`
	Timestamp string        `json:"@timestamp"`
	Host      *SystemInfo   `json:"host"`
	Agent     *AgentInfo    `json:"agent"`
	Inventory *InventoryInfo `json:"inventory"`
	Security  *SecurityInfo `json:"security"`
	Findings  []Finding     `json:"findings"`
	Metadata  *MetadataInfo `json:"metadata"`
}

// InventoryInfo содержит инвентаризационные данные
type InventoryInfo struct {
	Processes []ProcessInfo `json:"processes"`
	Autoruns  *AutorunsInfo `json:"autoruns"`
}

// Finding представляет результат анализа безопасности
type Finding struct {
	RuleID    string `json:"rule_id"`
	Severity  string `json:"severity"`
	MessageRu string `json:"message_ru"`
	Evidence  string `json:"evidence"`
}

// MetadataInfo содержит метаданные события
type MetadataInfo struct {
	Collector     string `json:"collector"`
	SchemaVersion string `json:"schema_version"`
}

// CollectHostPosture выполняет полный сбор данных о состоянии хоста
func (c *Collector) CollectHostPosture(ctx context.Context) (*HostPostureData, error) {
	data := &HostPostureData{
		EventID:   uuid.New().String(),
		EventType: "host_posture",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Agent:     &AgentInfo{},
		Inventory: &InventoryInfo{},
		Metadata: &MetadataInfo{
			Collector:     "win_agent_basic_posture",
			SchemaVersion: "1.0",
		},
	}

	// Сбор системной информации
	systemInfo, err := c.collectSystemInfo(ctx)
	if err != nil {
		return nil, err
	}
	data.Host = systemInfo

	// Сбор информации о процессах
	processes, err := c.collectProcesses(ctx)
	if err != nil {
		return nil, err
	}
	data.Inventory.Processes = c.filterProcesses(processes)

	// Сбор автозапусков
	autoruns, err := c.collectAutoruns(ctx)
	if err != nil {
		return nil, err
	}
	data.Inventory.Autoruns = autoruns

	// Сбор параметров безопасности
	security, err := c.collectSecurity(ctx)
	if err != nil {
		return nil, err
	}
	data.Security = security

	return data, nil
}
