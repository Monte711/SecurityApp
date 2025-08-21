@echo off
echo ===========================================
echo UECP Agent Windows - Тестовый запуск
echo ===========================================

REM Проверка наличия исполняемого файла
if not exist "uecp-agent.exe" (
    echo ОШИБКА: Исполняемый файл uecp-agent.exe не найден
    echo Выполните сборку командой: build.bat
    pause
    exit /b 1
)

REM Проверка наличия конфигурации
if not exist "config.json" (
    echo ОШИБКА: Файл конфигурации config.json не найден
    pause
    exit /b 1
)

echo Тестовый запуск агента (однократный сбор)...
echo.

REM Создание тестовой директории
if not exist "test-output" mkdir "test-output"

REM Запуск агента с сохранением результата в файл
uecp-agent.exe -config config.json -once -output test-output\host_posture.json

if %errorlevel% equ 0 (
    echo.
    echo ===========================================
    echo Тестовый запуск завершен успешно!
    echo ===========================================
    echo.
    echo Результат сохранен в: test-output\host_posture.json
    echo.
    
    REM Показ краткой статистики
    if exist "test-output\host_posture.json" (
        echo Размер файла результата:
        for %%I in ("test-output\host_posture.json") do echo   %%~zI байт
        echo.
        echo Для просмотра результата откройте файл:
        echo   test-output\host_posture.json
    )
) else (
    echo.
    echo ОШИБКА: Тестовый запуск завершен с ошибкой
    echo Проверьте логи и конфигурацию
)

echo.
pause
