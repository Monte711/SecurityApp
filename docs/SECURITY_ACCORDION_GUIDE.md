# SecurityAccordion - Документация

## Обзор

SecurityAccordion заменяет предыдущий сеточный интерфейс SecurityCards на компактный, удобный accordion-интерфейс для отображения параметров безопасности хоста.

## Архитектура компонентов

### Основные компоненты

1. **SecurityAccordion** - главный контейнер
2. **SecurityItem** - отдельный элемент accordion
3. **SecurityDetails** - раскрываемое содержимое элемента
4. **SecurityFilters** - панель фильтрации

### Структура данных

```typescript
interface SecurityItemData {
  id: string;
  name: string;
  status: SecurityItemStatus;
  severity: SecurityItemSeverity;
  details: Record<string, any>;
  source: string;
  last_seen: string;
  icon?: string;
  description?: string;
  recommendations?: string[];
  raw_data?: any;
}
```

## Функциональность

### 🔍 Фильтрация и поиск

- **Текстовый поиск** по названию и описанию параметров
- **Фильтр по статусу**: все / только проблемы / без данных
- **Фильтр по серьезности**: critical / high / medium / low / none
- **Сортировка**: по серьезности / времени / названию

### 📱 Отзывчивый дизайн

- Адаптируется под разные размеры экрана
- Компактное отображение на мобильных устройствах
- Горизонтальная прокрутка для фильтров на узких экранах

### ♿ Доступность

- Полная поддержка ARIA атрибутов
- Навигация с клавиатуры (Enter/Space для раскрытия, Escape для закрытия)
- Семантическая разметка с role="listitem"
- Индикаторы состояния для screen readers

### 💾 Персистентность

- Сохранение настроек фильтров в localStorage
- Восстановление состояния при перезагрузке страницы
- Индивидуальные настройки для каждого хоста

### 🔄 Управление состоянием

- Асинхронная загрузка данных
- Обработка ошибок с retry функциональностью
- Индикаторы загрузки и пустого состояния
- Оптимистичные обновления

## Использование

### Базовое использование

```tsx
import { SecurityAccordion } from './components/security/SecurityAccordion';

function HostDashboard() {
  return (
    <SecurityAccordion hostId="host-123" />
  );
}
```

### Кастомизация

```tsx
<SecurityAccordion 
  hostId="host-123"
  defaultFilters={{
    statusFilter: 'problems_only',
    severityFilter: 'high'
  }}
  onDataChange={(items) => console.log('Updated items:', items)}
/>
```

## Статусы и индикаторы

### Статусы безопасности

- **ok** 🟢 - Параметр настроен правильно
- **disabled** 🟡 - Параметр отключен
- **no_data** ⚪ - Нет данных
- **denied** 🔴 - Доступ запрещен
- **unknown** ⚫ - Неизвестный статус

### Уровни серьезности

- **critical** 🚨 - Критические проблемы безопасности
- **high** ⚠️ - Высокий уровень риска
- **medium** 🟡 - Средний уровень риска
- **low** 🔵 - Низкий уровень риска
- **none** ✅ - Нет проблем

## API и интеграция

### SecurityAccordionNormalizer

Класс для преобразования данных из существующего формата в формат accordion:

```typescript
const normalizer = new SecurityAccordionNormalizer();
const items = normalizer.normalizeSecurityData(securityData);
```

### Поддерживаемые источники данных

- Windows Defender (antivirus, firewall, real-time protection)
- BitLocker (encryption status, volumes)
- System settings (UAC, Secure Boot, Device Guard)
- Network security (RDP, SMB, network discovery)
- User accounts and password policies
- Windows Updates

## Тестирование

### Unit тесты

```bash
npm test -- SecurityAccordion
npm test -- securityAccordionNormalizer
```

### E2E тесты

```bash
# Требует запущенного приложения
npm run test:e2e

# С отображением браузера
npm run test:e2e:headed

# Отладочный режим
npm run test:e2e:debug
```

### Покрытие тестами

- ✅ Нормализация данных
- ✅ Фильтрация и поиск
- ✅ Раскрытие/сворачивание элементов
- ✅ Обработка ошибок
- ✅ Персистентность настроек
- ✅ Accessibility
- ✅ Responsive design

## Производительность

### Оптимизации

- Виртуализация списка для больших объемов данных
- Дебаунсинг поискового ввода (300ms)
- Мемоизация вычислений фильтрации
- Ленивая загрузка детальных данных

### Метрики

- Время первого рендера: < 100ms
- Время отклика фильтров: < 50ms
- Размер бандла: +15KB (gzipped)

## Миграция с SecurityCards

### Что изменилось

1. **Интерфейс**: сетка → accordion
2. **Фильтрация**: базовая → расширенная
3. **Данные**: простые статусы → детальная информация
4. **Навигация**: клики → раскрытие/сворачивание

### Совместимость

- API остается тем же
- Данные автоматически преобразуются
- Настройки фильтров сбрасываются (новый формат)

### Пошаговая миграция

1. Замените импорт:
```tsx
// Старое
import { SecurityCards } from './SecurityCards';

// Новое  
import { SecurityAccordion } from './security/SecurityAccordion';
```

2. Обновите использование:
```tsx
// Старое
<SecurityCards hostId={hostId} />

// Новое
<SecurityAccordion hostId={hostId} />
```

3. (Опционально) Удалите старые файлы после тестирования

## Настройка и конфигурация

### Переменные окружения

```env
# Время дебаунса поиска (мс)
VITE_SEARCH_DEBOUNCE=300

# Максимальное количество элементов на странице
VITE_MAX_ITEMS_PER_PAGE=50

# Включить дополнительную отладку
VITE_DEBUG_SECURITY=false
```

### Кастомизация стилей

```css
/* Кастомные цвета статусов */
.security-item--ok { 
  --status-color: #10b981; 
}

.security-item--disabled { 
  --status-color: #f59e0b; 
}

.security-item--critical {
  --severity-color: #ef4444;
}
```

## Устранение неполадок

### Частые проблемы

1. **Данные не загружаются**
   - Проверьте сетевые запросы в DevTools
   - Убедитесь, что hostId корректный
   - Проверьте права доступа к API

2. **Фильтры не работают**
   - Очистите localStorage
   - Проверьте консоль на ошибки JavaScript
   - Перезагрузите страницу

3. **Медленная работа**
   - Проверьте количество элементов (>100)
   - Включите виртуализацию
   - Оптимизируйте фильтры

### Отладка

```typescript
// Включить отладочные логи
localStorage.setItem('debug', 'SecurityAccordion*');

// Проверить состояние нормализатора
console.log(normalizer.getDebugInfo());

// Экспорт данных для анализа
console.log(JSON.stringify(securityItems, null, 2));
```

## Поддержка и обратная связь

- 📧 Техническая поддержка: [support@example.com]
- 🐛 Сообщения об ошибках: [GitHub Issues]
- 💡 Предложения: [Feature Requests]
- 📚 Дополнительная документация: [Wiki]
