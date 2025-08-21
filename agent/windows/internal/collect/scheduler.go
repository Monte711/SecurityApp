package collect

import (
	"context"
	"log"
	"time"
)

// Scheduler управляет расписанием выполнения сбора данных
type Scheduler struct {
	collector *Collector
	interval  time.Duration
	stopCh    chan struct{}
}

// NewScheduler создает новый планировщик
func NewScheduler(collector *Collector, intervalSeconds int) *Scheduler {
	return &Scheduler{
		collector: collector,
		interval:  time.Duration(intervalSeconds) * time.Second,
		stopCh:    make(chan struct{}),
	}
}

// Start запускает планировщик
func (s *Scheduler) Start(ctx context.Context, callback func(*HostPostureData) error) {
	log.Printf("Планировщик запущен с интервалом %v", s.interval)
	
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Первый запуск немедленно
	s.runCollection(ctx, callback)

	for {
		select {
		case <-ticker.C:
			s.runCollection(ctx, callback)
		case <-s.stopCh:
			log.Println("Планировщик остановлен")
			return
		case <-ctx.Done():
			log.Println("Планировщик остановлен по контексту")
			return
		}
	}
}

// Stop останавливает планировщик
func (s *Scheduler) Stop() {
	close(s.stopCh)
}

// runCollection выполняет сбор данных
func (s *Scheduler) runCollection(ctx context.Context, callback func(*HostPostureData) error) {
	log.Println("Начало планового сбора данных...")
	
	data, err := s.collector.CollectHostPosture(ctx)
	if err != nil {
		log.Printf("Ошибка сбора данных: %v", err)
		return
	}

	if callback != nil {
		if err := callback(data); err != nil {
			log.Printf("Ошибка обработки собранных данных: %v", err)
		}
	}

	log.Println("Плановый сбор данных завершен")
}
