package util

import (
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

// SignatureChecker проверяет цифровые подписи файлов
type SignatureChecker struct{}

// NewSignatureChecker создает новый проверщик подписей
func NewSignatureChecker() *SignatureChecker {
	return &SignatureChecker{}
}

// SignatureInfo содержит информацию о цифровой подписи
type SignatureInfo struct {
	IsSigned        bool   `json:"is_signed"`
	IsValid         bool   `json:"is_valid"`
	Subject         string `json:"subject,omitempty"`
	Issuer          string `json:"issuer,omitempty"`
	SignatureStatus string `json:"signature_status"`
	Error           string `json:"error,omitempty"`
}

// CheckSignature проверяет цифровую подпись файла
func (s *SignatureChecker) CheckSignature(filePath string) *SignatureInfo {
	info := &SignatureInfo{
		IsSigned:        false,
		IsValid:         false,
		SignatureStatus: "not_checked",
	}

	// Загрузка wintrust.dll
	wintrust := windows.NewLazySystemDLL("wintrust.dll")
	winVerifyTrust := wintrust.NewProc("WinVerifyTrustW")
	
	crypt32 := windows.NewLazySystemDLL("crypt32.dll")
	certGetNameString := crypt32.NewProc("CertGetNameStringW")

	if err := wintrust.Load(); err != nil {
		info.Error = fmt.Sprintf("ошибка загрузки wintrust.dll: %v", err)
		return info
	}

	// Преобразование пути в UTF16
	filePathUTF16, err := windows.UTF16PtrFromString(filePath)
	if err != nil {
		info.Error = fmt.Sprintf("ошибка преобразования пути: %v", err)
		return info
	}

	// Структуры для WinVerifyTrust
	type WINTRUST_FILE_INFO struct {
		cbStruct       uint32
		pcwszFilePath  *uint16
		hFile          windows.Handle
		pgKnownSubject *windows.GUID
	}

	type WINTRUST_DATA struct {
		cbStruct                        uint32
		pPolicyCallbackData             uintptr
		pSIPClientData                  uintptr
		dwUIChoice                      uint32
		fdwRevocationChecks             uint32
		dwUnionChoice                   uint32
		pFile                           *WINTRUST_FILE_INFO
		dwStateAction                   uint32
		hWVTStateData                   windows.Handle
		pwszURLReference                *uint16
		dwProvFlags                     uint32
		dwUIContext                     uint32
		pSignatureSettings              uintptr
	}

	// Константы
	const (
		WTD_UI_NONE                    = 2
		WTD_REVOKE_NONE               = 0
		WTD_CHOICE_FILE               = 1
		WTD_STATEACTION_VERIFY        = 1
		WTD_STATEACTION_CLOSE         = 2
		TRUST_E_NOSIGNATURE           = 0x800B0100
		TRUST_E_SUBJECT_NOT_TRUSTED   = 0x800B0004
		TRUST_E_PROVIDER_UNKNOWN      = 0x800B0001
		TRUST_E_ACTION_UNKNOWN        = 0x800B0002
		TRUST_E_SUBJECT_FORM_UNKNOWN  = 0x800B0003
	)

	// GUID для WINTRUST_ACTION_GENERIC_VERIFY_V2
	actionGUID := windows.GUID{
		Data1: 0x00AAC56B,
		Data2: 0xCD44,
		Data3: 0x11d0,
		Data4: [8]byte{0x8C, 0xC2, 0x00, 0xC0, 0x4F, 0xC2, 0x95, 0xEE},
	}

	// Настройка структур
	fileInfo := WINTRUST_FILE_INFO{
		cbStruct:      uint32(unsafe.Sizeof(WINTRUST_FILE_INFO{})),
		pcwszFilePath: filePathUTF16,
		hFile:         0,
	}

	trustData := WINTRUST_DATA{
		cbStruct:            uint32(unsafe.Sizeof(WINTRUST_DATA{})),
		dwUIChoice:          WTD_UI_NONE,
		fdwRevocationChecks: WTD_REVOKE_NONE,
		dwUnionChoice:       WTD_CHOICE_FILE,
		pFile:               &fileInfo,
		dwStateAction:       WTD_STATEACTION_VERIFY,
	}

	// Вызов WinVerifyTrust
	ret, _, _ := winVerifyTrust.Call(
		0, // hwnd
		uintptr(unsafe.Pointer(&actionGUID)),
		uintptr(unsafe.Pointer(&trustData)),
	)

	// Анализ результата
	switch ret {
	case 0:
		info.IsSigned = true
		info.IsValid = true
		info.SignatureStatus = "valid"
	case uintptr(TRUST_E_NOSIGNATURE):
		info.IsSigned = false
		info.IsValid = false
		info.SignatureStatus = "not_signed"
	case uintptr(TRUST_E_SUBJECT_NOT_TRUSTED):
		info.IsSigned = true
		info.IsValid = false
		info.SignatureStatus = "untrusted"
	case uintptr(TRUST_E_PROVIDER_UNKNOWN):
		info.IsSigned = true
		info.IsValid = false
		info.SignatureStatus = "unknown_provider"
	case uintptr(TRUST_E_ACTION_UNKNOWN):
		info.Error = "неизвестное действие проверки"
		info.SignatureStatus = "error"
	case uintptr(TRUST_E_SUBJECT_FORM_UNKNOWN):
		info.Error = "неизвестная форма субъекта"
		info.SignatureStatus = "error"
	default:
		info.Error = fmt.Sprintf("ошибка проверки подписи: 0x%X", ret)
		info.SignatureStatus = "error"
	}

	// Попытка получить информацию о сертификате (упрощенная версия)
	if info.IsSigned {
		info.Subject = s.getCertificateSubject(filePath, certGetNameString)
	}

	// Очистка состояния
	trustData.dwStateAction = WTD_STATEACTION_CLOSE
	winVerifyTrust.Call(
		0,
		uintptr(unsafe.Pointer(&actionGUID)),
		uintptr(unsafe.Pointer(&trustData)),
	)

	return info
}

// getCertificateSubject пытается получить субъект сертификата (упрощенная версия)
func (s *SignatureChecker) getCertificateSubject(filePath string, certGetNameString *windows.LazyProc) string {
	// Это упрощенная реализация
	// В полной версии нужно было бы использовать CryptQueryObject и другие API
	// для извлечения информации о сертификате
	return "проверка субъекта не реализована"
}

// CheckSignatureSafe безопасно проверяет подпись файла
func (s *SignatureChecker) CheckSignatureSafe(filePath string) *SignatureInfo {
	defer func() {
		if r := recover(); r != nil {
			// Восстановление после паники
		}
	}()

	return s.CheckSignature(filePath)
}

// IsFileSignedAndValid проверяет, подписан ли файл и валидна ли подпись
func (s *SignatureChecker) IsFileSignedAndValid(filePath string) bool {
	info := s.CheckSignatureSafe(filePath)
	return info.IsSigned && info.IsValid
}

// GetSignatureStatus возвращает только статус подписи
func (s *SignatureChecker) GetSignatureStatus(filePath string) string {
	info := s.CheckSignatureSafe(filePath)
	if info.Error != "" {
		return "error"
	}
	return info.SignatureStatus
}
