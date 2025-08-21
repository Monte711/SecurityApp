# Инструкция по передаче проекта другому пользователю Git

## Способ 1: Создание нового репозитория у другого пользователя

### Подготовка проекта для передачи

1. **Создайте .gitignore файл** (если еще нет):
```bash
cd C:\Users\PC\Desktop\test
echo "# Исключения для Windows" > .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo "build/" >> .gitignore
echo "*.exe" >> .gitignore
echo "*.log" >> .gitignore
echo "data.json" >> .gitignore
echo "test_*.json" >> .gitignore
```

2. **Инициализируйте Git репозиторий** (если еще не сделано):
```bash
git init
git add .
git commit -m "Initial commit: Complete cybersecurity platform"
```

### Вариант A: Через GitHub/GitLab Web Interface

1. **Попросите другого пользователя создать новый пустой репозиторий** на GitHub/GitLab
2. **Добавьте remote к новому репозиторию**:
```bash
git remote add origin https://github.com/USERNAME/REPOSITORY_NAME.git
git branch -M main
git push -u origin main
```

### Вариант B: Создание архива

1. **Создайте zip архив проекта**:
```powershell
Compress-Archive -Path "C:\Users\PC\Desktop\test\*" -DestinationPath "C:\Users\PC\Desktop\cybersecurity-platform.zip"
```

2. **Отправьте архив** через email/облачное хранилище

3. **Получатель распаковывает и инициализирует Git**:
```bash
git init
git add .
git commit -m "Initial commit: Complete cybersecurity platform"
git remote add origin https://github.com/NEW_USER/NEW_REPO.git
git push -u origin main
```

## Способ 2: Transfer ownership существующего репозитория

### Через GitHub Web Interface

1. **Зайдите в Settings репозитория** → **General** → **Danger Zone**
2. **Нажмите "Transfer ownership"**
3. **Введите username нового владельца**
4. **Подтвердите передачу**

### Через Git командную строку

1. **Пригласите пользователя как коллаборатора**:
   - Settings → Manage access → Invite a collaborator

2. **Дайте права администратора**

3. **Новый пользователь может создать fork или clone**

## Способ 3: Создание организации

1. **Создайте GitHub Organization**
2. **Добавьте оба аккаунта как владельцев**
3. **Перенесите репозиторий в организацию**

## Подготовка документации для передачи

### Создайте файл README для нового пользователя:

```markdown
# UECP - Unified Enterprise Cybersecurity Platform

## Быстрый старт

1. Убедитесь, что установлены:
   - Docker Desktop
   - Go 1.25+
   - Node.js 18+

2. Запустите платформу:
```bash
cd INFRA
docker-compose up -d
```

3. Откройте браузер:
   - UI: http://localhost:3000
   - API: http://localhost:8000
   - OpenSearch: http://localhost:9200

## Структура проекта
- `agent/windows/` - Windows агент на Go
- `ingest-api/` - FastAPI backend
- `ui/` - React frontend
- `INFRA/` - Docker конфигурация
```

### Команды для выполнения передачи

```powershell
# Перейдите в каталог проекта
cd C:\Users\PC\Desktop\test

# Создайте .gitignore если нет
if (-not (Test-Path .gitignore)) {
    @"
__pycache__/
*.pyc
.env
node_modules/
dist/
build/
*.exe
*.log
data.json
test_*.json
"@ | Out-File -FilePath .gitignore -Encoding UTF8
}

# Инициализируйте Git если нужно
if (-not (Test-Path .git)) {
    git init
}

# Добавьте все файлы
git add .

# Сделайте коммит
git commit -m "Complete UECP platform with Russian UI and autonomous agent"

# Добавьте remote (замените URL на актуальный)
git remote add origin https://github.com/NEW_USER/NEW_REPO.git

# Отправьте код
git branch -M main
git push -u origin main
```

## Что нужно передать новому пользователю

1. **Ссылку на репозиторий**
2. **Инструкцию по запуску** (файл QUICK_START.md)
3. **Документацию по архитектуре** (папка docs/)
4. **Конфигурационные файлы** с примерами

## Важные заметки

- Убедитесь, что в репозитории нет приватных ключей или паролей
- Файлы с расширением .exe не будут включены в Git (они в .gitignore)
- Новому пользователю нужно будет пересобрать агент на его системе
- Docker образы нужно будет собрать заново

## После передачи

Новый пользователь должен:

1. Клонировать репозиторий
2. Выполнить `docker-compose up -d` в папке INFRA
3. Пересобрать Windows агент: `cd agent/windows && go build`
4. Запустить агент в автономном режиме

Платформа будет полностью функциональна с русским интерфейсом и автономным сбором данных.
