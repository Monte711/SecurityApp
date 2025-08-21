package store

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/uecp/agent-windows/internal/collect"
)

const (
	maxSpoolFiles = 100     // максимальное количество файлов в спуле
	fileExtension = ".json" // расширение файлов данных
)

// SpoolStore управляет локальным хранением событий
type SpoolStore struct {
	spoolDir string
}

// NewSpoolStore создает новое хранилище
func NewSpoolStore(spoolDir string) *SpoolStore {
	return &SpoolStore{
		spoolDir: spoolDir,
	}
}

// SpoolEvent представляет сохраненное событие
type SpoolEvent struct {
	ID        string                     `json:"id"`
	Timestamp time.Time                  `json:"timestamp"`
	Data      *collect.HostPostureData   `json:"data"`
}

// Store сохраняет данные в спул
func (s *SpoolStore) Store(ctx context.Context, data *collect.HostPostureData) error {
	// Создание директории спула если не существует
	if err := os.MkdirAll(s.spoolDir, 0700); err != nil {
		return fmt.Errorf("ошибка создания директории спула: %w", err)
	}

	// Создание события
	event := &SpoolEvent{
		ID:        uuid.New().String(),
		Timestamp: time.Now(),
		Data:      data,
	}

	// Сериализация в JSON
	jsonData, err := json.MarshalIndent(event, "", "  ")
	if err != nil {
		return fmt.Errorf("ошибка сериализации события: %w", err)
	}

	// Создание файла
	filename := fmt.Sprintf("%s%s", event.ID, fileExtension)
	filepath := filepath.Join(s.spoolDir, filename)

	err = os.WriteFile(filepath, jsonData, 0600)
	if err != nil {
		return fmt.Errorf("ошибка записи файла спула: %w", err)
	}

	// Очистка старых файлов если превышен лимит
	if err := s.cleanupOldFiles(); err != nil {
		// Логируем ошибку, но не прерываем выполнение
		fmt.Printf("Предупреждение: ошибка очистки старых файлов спула: %v\n", err)
	}

	return nil
}

// GetPendingEvents возвращает все сохраненные события
func (s *SpoolStore) GetPendingEvents(ctx context.Context) ([]*SpoolEvent, error) {
	// Чтение содержимого директории
	entries, err := os.ReadDir(s.spoolDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []*SpoolEvent{}, nil
		}
		return nil, fmt.Errorf("ошибка чтения директории спула: %w", err)
	}

	var events []*SpoolEvent

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != fileExtension {
			continue
		}

		filePath := filepath.Join(s.spoolDir, entry.Name())
		event, err := s.loadEventFromFile(filePath)
		if err != nil {
			fmt.Printf("Предупреждение: ошибка загрузки события из файла %s: %v\n", filePath, err)
			continue
		}

		events = append(events, event)
	}

	// Сортировка по времени создания
	sort.Slice(events, func(i, j int) bool {
		return events[i].Timestamp.Before(events[j].Timestamp)
	})

	return events, nil
}

// RemoveEvent удаляет событие из спула
func (s *SpoolStore) RemoveEvent(ctx context.Context, eventID string) error {
	filename := fmt.Sprintf("%s%s", eventID, fileExtension)
	filePath := filepath.Join(s.spoolDir, filename)

	err := os.Remove(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // файл уже удален
		}
		return fmt.Errorf("ошибка удаления файла спула: %w", err)
	}

	return nil
}

// GetEventCount возвращает количество событий в спуле
func (s *SpoolStore) GetEventCount(ctx context.Context) (int, error) {
	entries, err := os.ReadDir(s.spoolDir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, fmt.Errorf("ошибка чтения директории спула: %w", err)
	}

	count := 0
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == fileExtension {
			count++
		}
	}

	return count, nil
}

// loadEventFromFile загружает событие из файла
func (s *SpoolStore) loadEventFromFile(filePath string) (*SpoolEvent, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения файла: %w", err)
	}

	var event SpoolEvent
	err = json.Unmarshal(data, &event)
	if err != nil {
		return nil, fmt.Errorf("ошибка десериализации события: %w", err)
	}

	return &event, nil
}

// cleanupOldFiles удаляет старые файлы если превышен лимит
func (s *SpoolStore) cleanupOldFiles() error {
	entries, err := os.ReadDir(s.spoolDir)
	if err != nil {
		return fmt.Errorf("ошибка чтения директории: %w", err)
	}

	// Фильтрация только JSON файлов
	var jsonFiles []os.DirEntry
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == fileExtension {
			jsonFiles = append(jsonFiles, entry)
		}
	}

	// Если количество файлов не превышает лимит, ничего не делаем
	if len(jsonFiles) <= maxSpoolFiles {
		return nil
	}

	// Сортировка по времени модификации (старые первыми)
	sort.Slice(jsonFiles, func(i, j int) bool {
		infoI, err1 := jsonFiles[i].Info()
		infoJ, err2 := jsonFiles[j].Info()
		if err1 != nil || err2 != nil {
			return false
		}
		return infoI.ModTime().Before(infoJ.ModTime())
	})

	// Удаление старых файлов
	filesToDelete := len(jsonFiles) - maxSpoolFiles
	for i := 0; i < filesToDelete; i++ {
		filePath := filepath.Join(s.spoolDir, jsonFiles[i].Name())
		if err := os.Remove(filePath); err != nil {
			return fmt.Errorf("ошибка удаления старого файла %s: %w", filePath, err)
		}
	}

	return nil
}
