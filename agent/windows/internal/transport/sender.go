package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/uecp/agent-windows/internal/collect"
)

// Sender отвечает за отправку данных в API
type Sender struct {
	baseURL    string
	httpClient *http.Client
}

// NewSender создает новый отправитель
func NewSender(baseURL string, timeout time.Duration) *Sender {
	return &Sender{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// SendHostPosture отправляет данные о состоянии хоста в API
func (s *Sender) SendHostPosture(ctx context.Context, data *collect.HostPostureData) error {
	// Сериализация данных в JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("ошибка сериализации данных в JSON: %w", err)
	}

	// Создание HTTP запроса
	url := s.baseURL
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("ошибка создания HTTP запроса: %w", err)
	}

	// Установка заголовков
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "UECP-Agent-Windows/0.1.0")

	// Выполнение запроса
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("ошибка выполнения HTTP запроса: %w", err)
	}
	defer resp.Body.Close()

	// Чтение ответа
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("ошибка чтения ответа: %w", err)
	}

	// Проверка статуса ответа
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("получен ошибочный статус ответа %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// SendWithRetry отправляет данные с повторными попытками
func (s *Sender) SendWithRetry(ctx context.Context, data *collect.HostPostureData, maxRetries int) error {
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Экспоненциальная задержка между попытками
			delay := time.Duration(attempt*attempt) * time.Second
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}

		err := s.SendHostPosture(ctx, data)
		if err == nil {
			return nil
		}

		lastErr = err
	}

	return fmt.Errorf("не удалось отправить данные после %d попыток: %w", maxRetries, lastErr)
}
