package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/uecp/agent-windows/internal/collect"
	"github.com/uecp/agent-windows/internal/recommend"
	"github.com/uecp/agent-windows/internal/store"
	"github.com/uecp/agent-windows/internal/transport"
)

// Config представляет конфигурацию агента
type Config struct {
	IngestURL       string `json:"ingest_url"`
	AgentID         string `json:"agent_id"`
	AgentVersion    string `json:"agent_version"`
	CollectHashes   bool   `json:"collect_hashes"`
	RunMode         string `json:"run_mode"`
	IntervalSeconds int    `json:"interval_seconds"`
	SpoolDir        string `json:"spool_dir"`
	LogFile         string `json:"log_file"`
	LogLevel        string `json:"log_level"`
	TimeoutSeconds  int    `json:"timeout_seconds"`
}

// defaultConfig возвращает конфигурацию по умолчанию
func defaultConfig() *Config {
	return &Config{
		IngestURL:       "http://localhost:8000/ingest",
		AgentID:         "win-agent-001",
		AgentVersion:    "0.1.0",
		CollectHashes:   false,
		RunMode:         "once",
		IntervalSeconds: 900,
		SpoolDir:        `C:\ProgramData\UECP\spool`,
		LogFile:         `C:\ProgramData\UECP\logs\agent.log`,
		LogLevel:        "info",
		TimeoutSeconds:  10,
	}
}

func main() {
	var (
		configPath = flag.String("config", "config.json", "Путь к файлу конфигурации")
		once       = flag.Bool("once", false, "Запустить один раз (игнорирует run_mode в конфиге)")
		output     = flag.String("output", "", "Файл для сохранения JSON результата (для автономного режима)")
	)
	flag.Parse()

	// Загрузка конфигурации
	config, err := loadConfig(*configPath)
	if err != nil {
		log.Printf("Ошибка загрузки конфигурации: %v. Используется конфигурация по умолчанию.", err)
		config = defaultConfig()
	}

	// Настройка логирования
	if err := setupLogging(config.LogFile); err != nil {
		log.Printf("Предупреждение: не удалось настроить файл лога: %v", err)
	}

	log.Printf("Запуск UECP Agent Windows v%s", config.AgentVersion)
	log.Printf("Режим работы: %s", config.RunMode)

	// Создание директории для спула если не существует
	if err := os.MkdirAll(config.SpoolDir, 0755); err != nil {
		log.Printf("Предупреждение: не удалось создать директорию спула %s: %v", config.SpoolDir, err)
	}

	// Создание компонентов
	collector := collect.NewCollector(config.CollectHashes)
	recommender := recommend.NewEngine()
	spoolStore := store.NewSpoolStore(config.SpoolDir)
	sender := transport.NewSender(config.IngestURL, time.Duration(config.TimeoutSeconds)*time.Second)

	// Определение режима запуска
	runOnce := *once || config.RunMode == "once"

	if runOnce {
		log.Println("Выполнение однократного сбора данных...")
		err := performCollection(collector, recommender, sender, spoolStore, config, *output)
		if err != nil {
			log.Printf("Ошибка при сборе данных: %v", err)
			os.Exit(1)
		}
		log.Println("Сбор данных завершен успешно")
	} else {
		log.Printf("Запуск в режиме демона с интервалом %d секунд", config.IntervalSeconds)
		runDaemon(collector, recommender, sender, spoolStore, config)
	}
}

func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("не удалось прочитать файл конфигурации: %w", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("не удалось разобрать JSON конфигурации: %w", err)
	}

	return &config, nil
}

func setupLogging(logFile string) error {
	if logFile == "" {
		return nil
	}

	logDir := filepath.Dir(logFile)
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return err
	}

	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return err
	}

	log.SetOutput(file)
	return nil
}

func performCollection(collector *collect.Collector, recommender *recommend.Engine, 
	sender *transport.Sender, spoolStore *store.SpoolStore, config *Config, outputFile string) error {
	
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(config.TimeoutSeconds)*time.Second)
	defer cancel()

	log.Println("Начинается сбор данных о состоянии хоста...")

	// Сбор данных о хосте
	hostData, err := collector.CollectHostPosture(ctx)
	if err != nil {
		return fmt.Errorf("ошибка сбора данных о хосте: %w", err)
	}

	log.Printf("Собрано данных: процессов=%d, автозапусков=%d", 
		len(hostData.Inventory.Processes), 
		len(hostData.Inventory.Autoruns.Registry)+len(hostData.Inventory.Autoruns.ServicesAuto))

	// Анализ и генерация рекомендаций
	findings := recommender.AnalyzeHostPosture(hostData)
	hostData.Findings = findings

	log.Printf("Создано рекомендаций: %d", len(findings))

	// Добавление метаданных агента
	hostData.Agent.AgentID = config.AgentID
	hostData.Agent.AgentVersion = config.AgentVersion

	// Если указан файл вывода - сохраняем JSON
	if outputFile != "" {
		if err := saveToFile(hostData, outputFile); err != nil {
			log.Printf("Ошибка сохранения в файл %s: %v", outputFile, err)
		} else {
			log.Printf("Результат сохранен в файл: %s", outputFile)
		}
	}

	// Попытка отправки через API
	if err := sender.SendHostPosture(ctx, hostData); err != nil {
		log.Printf("Не удалось отправить данные через API: %v", err)
		
		// Сохранение в спул для повторной отправки
		if spoolErr := spoolStore.Store(ctx, hostData); spoolErr != nil {
			log.Printf("Ошибка сохранения в спул: %v", spoolErr)
		} else {
			log.Println("Данные сохранены в спул для повторной отправки")
		}
	} else {
		log.Println("Данные успешно отправлены в API")
	}

	// Попытка отправки накопленных данных из спула
	events, err := spoolStore.GetPendingEvents(ctx)
	if err != nil {
		log.Printf("Ошибка получения событий из спула: %v", err)
	} else if len(events) > 0 {
		log.Printf("Найдено %d событий в спуле, попытка отправки...", len(events))
		for _, event := range events {
			if err := sender.SendHostPosture(ctx, event.Data); err == nil {
				spoolStore.RemoveEvent(ctx, event.ID)
			}
		}
	}

	return nil
}

func runDaemon(collector *collect.Collector, recommender *recommend.Engine,
	sender *transport.Sender, spoolStore *store.SpoolStore, config *Config) {
	
	interval := time.Duration(config.IntervalSeconds) * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("Демон запущен, первый сбор через %v", interval)

	for {
		select {
		case <-ticker.C:
			if err := performCollection(collector, recommender, sender, spoolStore, config, ""); err != nil {
				log.Printf("Ошибка в цикле сбора данных: %v", err)
			}
		}
	}
}

func saveToFile(data *collect.HostPostureData, filename string) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("ошибка сериализации в JSON: %w", err)
	}

	return os.WriteFile(filename, jsonData, 0644)
}
