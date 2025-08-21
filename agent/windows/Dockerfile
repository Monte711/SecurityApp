# Dockerfile для UECP Agent Windows
# 
# Этот Dockerfile предназначен для создания образа с агентом Windows
# для использования в Windows контейнерах
#
# Сборка: docker build -t uecp-agent-windows .
# Запуск: docker run -v C:\data:C:\data uecp-agent-windows

# Используем официальный образ Windows Server Core с Go
FROM mcr.microsoft.com/windows/servercore:ltsc2022 AS builder

# Установка Chocolatey для управления пакетами
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]
RUN Set-ExecutionPolicy Bypass -Scope Process -Force; \
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Установка Go
RUN choco install golang -y
RUN refreshenv

# Установка Git
RUN choco install git -y

# Настройка рабочей директории
WORKDIR /build

# Копирование исходного кода
COPY . .

# Сборка агента
RUN go mod tidy
RUN go build -ldflags="-s -w" -o uecp-agent.exe cmd/uecp-agent/main.go

# Финальный образ
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Создание пользователя для агента
RUN net user uecp-agent /add /passwordreq:no /expires:never && \
    net localgroup Users uecp-agent /add

# Создание рабочих директорий
RUN mkdir C:\ProgramData\UECP\spool && \
    mkdir C:\ProgramData\UECP\logs && \
    mkdir C:\UECP

# Копирование исполняемого файла и конфигурации
COPY --from=builder /build/uecp-agent.exe C:/UECP/
COPY --from=builder /build/config.json C:/UECP/
COPY --from=builder /build/README.md C:/UECP/

# Настройка переменных окружения
ENV UECP_CONFIG_PATH=C:/UECP/config.json
ENV UECP_SPOOL_DIR=C:/ProgramData/UECP/spool
ENV UECP_LOG_DIR=C:/ProgramData/UECP/logs

# Установка прав доступа
RUN icacls C:\UECP /grant uecp-agent:F /T && \
    icacls C:\ProgramData\UECP /grant uecp-agent:F /T

# Переключение на пользователя агента
USER uecp-agent

# Рабочая директория
WORKDIR C:/UECP

# Порты (если агент будет предоставлять веб-интерфейс в будущем)
EXPOSE 8080

# Проверка здоровья контейнера
HEALTHCHECK --interval=5m --timeout=30s --start-period=1m --retries=3 \
    CMD powershell -Command "if (Test-Path C:\ProgramData\UECP\logs\agent.log) { exit 0 } else { exit 1 }"

# Команда по умолчанию
CMD ["uecp-agent.exe", "-config", "config.json"]

# Метаданные
LABEL maintainer="UECP Security Team"
LABEL version="0.1.0"
LABEL description="UECP Agent для Windows - инвентаризация и оценка безопасности"
LABEL org.opencontainers.image.title="UECP Agent Windows"
LABEL org.opencontainers.image.description="Агент безопасности для сбора данных о состоянии Windows хостов"
LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.vendor="UECP"
