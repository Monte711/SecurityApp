# Scripts - Утилиты организации репозитория

Этот модуль содержит скрипты для автоматизированной организации и поддержания порядка в репозитории.

## organize_repo.py

Главный скрипт для организации файлов в репозитории. Перемещает файлы в архивную папку с сохранением возможности отката.

### Основные возможности

- **Dry-run режим** (по умолчанию) - показывает что будет изменено без фактического выполнения
- **Организация файлов** - сортировка по типам в архивную папку
- **Undo функция** - полный откат изменений через manifest.json
- **Защита ключевых папок** - не трогает .git, ui, server, infra, docs, ARTIFACTS, workspace, scripts
- **Настраиваемые паттерны** - можно задать свои правила классификации
- **Подробное логирование** - все операции записываются в scripts/organize_repo.log

### Использование

#### Предварительный просмотр (dry-run)
```bash
# Показать что будет изменено (безопасно)
python scripts/organize_repo.py

# Или явно указать dry-run
python scripts/organize_repo.py --dry-run
```

#### Выполнение организации
```bash
# Применить изменения
python scripts/organize_repo.py --apply

# Указать свою папку для архива
python scripts/organize_repo.py --apply --archive-dir my_archive

# Использовать собственные паттерны
python scripts/organize_repo.py --apply --patterns scripts/patterns.example.json
```

#### Отмена изменений
```bash
# Откатить используя manifest.json
python scripts/organize_repo.py --undo workspace/archived_files/manifest.json
```

### Структура после организации

```
workspace/
└── archived_files/
    ├── manifest.json              # Файл для отката изменений
    ├── operations_YYYYMMDD_HHMMSS.json  # Лог операций
    ├── docs/                      # .md, .txt, .rst файлы
    ├── config/                    # .json, .yml, .toml файлы
    ├── scripts/                   # .py, .sh, .ps1 файлы
    ├── frontend/                  # .html, .css, .js, .ts файлы
    ├── assets/images/             # .png, .jpg, .svg файлы
    ├── data/                      # .csv, .xml, .sql файлы
    └── misc/                      # Остальные файлы
```

### Защищенные папки

Эти папки **никогда не перемещаются**:
- `.git` - Git репозиторий
- `ui` - Frontend приложение
- `server` - Backend сервисы
- `infra` - Docker и инфраструктура
- `docs` - Основная документация
- `ARTIFACTS` - Артефакты проекта
- `workspace` - Рабочие файлы
- `scripts` - Утилиты (включая этот скрипт)

### Файлы конфигурации

#### patterns.example.json
Пример настройки паттернов для классификации файлов. Можно скопировать и адаптировать под свои нужды.

### Логирование

Все операции записываются в:
- `scripts/organize_repo.log` - подробный лог
- `workspace/archived_files/manifest.json` - информация для отката
- `workspace/archived_files/operations_*.json` - детальный лог операций

### Примеры использования

#### Типичный рабочий процесс

1. **Посмотреть что будет изменено:**
   ```bash
   python scripts/organize_repo.py
   ```

2. **Применить изменения если всё устраивает:**
   ```bash
   python scripts/organize_repo.py --apply
   ```

3. **При необходимости откатить:**
   ```bash
   python scripts/organize_repo.py --undo workspace/archived_files/manifest.json
   ```

#### Проверка результата
```bash
# Посмотреть что переместилось
ls -la workspace/archived_files/

# Проверить логи
cat scripts/organize_repo.log

# Посмотреть manifest
cat workspace/archived_files/manifest.json
```

### Безопасность

- По умолчанию режим dry-run - никаких изменений не делается
- Все операции логируются для возможности отката
- Защищенные папки никогда не затрагиваются
- Manifest.json содержит полную информацию для восстановления

### Требования

- Python 3.7+
- Стандартная библиотека (без дополнительных зависимостей)

### Решение проблем

#### Если что-то пошло не так:
1. Проверьте лог: `cat scripts/organize_repo.log`
2. Используйте undo: `python scripts/organize_repo.py --undo workspace/archived_files/manifest.json`
3. Восстановите из бэкапа если есть

#### Если нужно изменить логику:
1. Скопируйте `patterns.example.json` в свой файл
2. Отредактируйте паттерны под свои нужды
3. Используйте: `python scripts/organize_repo.py --patterns your_patterns.json`
