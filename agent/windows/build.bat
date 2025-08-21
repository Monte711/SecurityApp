@echo off
echo ===========================================
echo UECP Agent Windows - Сборка
echo ===========================================

REM Проверка наличия Go
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo ОШИБКА: Go не найден в системе
    echo Установите Go 1.22+ с https://golang.org/dl/
    pause
    exit /b 1
)

REM Проверка версии Go
for /f "tokens=3" %%i in ('go version') do set GO_VERSION=%%i
echo Версия Go: %GO_VERSION%

REM Переход в директорию агента
cd /d "%~dp0"

REM Установка зависимостей
echo.
echo Установка зависимостей...
go mod tidy
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось установить зависимости
    pause
    exit /b 1
)

REM Сборка агента
echo.
echo Сборка агента...
go build -ldflags="-s -w" -o uecp-agent.exe cmd/uecp-agent/main.go
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось собрать агент
    pause
    exit /b 1
)

REM Создание директорий
echo.
echo Создание рабочих директорий...
if not exist "C:\ProgramData\UECP\spool" mkdir "C:\ProgramData\UECP\spool"
if not exist "C:\ProgramData\UECP\logs" mkdir "C:\ProgramData\UECP\logs"

REM Копирование конфигурации
echo.
echo Копирование файлов конфигурации...
if not exist "C:\ProgramData\UECP\config.json" (
    copy config.json "C:\ProgramData\UECP\config.json"
)

echo.
echo ===========================================
echo Сборка завершена успешно!
echo ===========================================
echo.
echo Исполняемый файл: uecp-agent.exe
echo Конфигурация: C:\ProgramData\UECP\config.json
echo Спул: C:\ProgramData\UECP\spool
echo Логи: C:\ProgramData\UECP\logs
echo.
echo Примеры запуска:
echo   uecp-agent.exe -config config.json -once
echo   uecp-agent.exe -config C:\ProgramData\UECP\config.json
echo.
pause
