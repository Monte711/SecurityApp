package util

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
)

// HashCalculator вычисляет хеши файлов
type HashCalculator struct{}

// NewHashCalculator создает новый калькулятор хешей
func NewHashCalculator() *HashCalculator {
	return &HashCalculator{}
}

// CalculateSHA256 вычисляет SHA256 хеш файла
func (h *HashCalculator) CalculateSHA256(filePath string) (string, error) {
	// Открытие файла
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("ошибка открытия файла: %w", err)
	}
	defer file.Close()

	// Создание хеша
	hash := sha256.New()
	
	// Копирование содержимого файла в хеш
	_, err = io.Copy(hash, file)
	if err != nil {
		return "", fmt.Errorf("ошибка чтения файла: %w", err)
	}

	// Получение результата
	hashBytes := hash.Sum(nil)
	return fmt.Sprintf("%x", hashBytes), nil
}

// CalculateSHA256Safe безопасно вычисляет SHA256 хеш файла
// Возвращает пустую строку при ошибках вместо возвращения ошибки
func (h *HashCalculator) CalculateSHA256Safe(filePath string) string {
	hash, err := h.CalculateSHA256(filePath)
	if err != nil {
		return ""
	}
	return hash
}

// GetFileInfo возвращает информацию о файле включая хеш
type FileInfo struct {
	Path     string `json:"path"`
	Size     int64  `json:"size"`
	SHA256   string `json:"sha256,omitempty"`
	Exists   bool   `json:"exists"`
	Error    string `json:"error,omitempty"`
}

// GetFileInfoWithHash возвращает расширенную информацию о файле
func (h *HashCalculator) GetFileInfoWithHash(filePath string, calculateHash bool) *FileInfo {
	info := &FileInfo{
		Path:   filePath,
		Exists: false,
	}

	// Проверка существования файла
	stat, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			info.Error = "файл не существует"
		} else {
			info.Error = fmt.Sprintf("ошибка доступа к файлу: %v", err)
		}
		return info
	}

	info.Exists = true
	info.Size = stat.Size()

	// Вычисление хеша если требуется
	if calculateHash {
		hash, err := h.CalculateSHA256(filePath)
		if err != nil {
			info.Error = fmt.Sprintf("ошибка вычисления хеша: %v", err)
		} else {
			info.SHA256 = hash
		}
	}

	return info
}
