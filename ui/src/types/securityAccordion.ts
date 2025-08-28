// Типы для нового accordion-интерфейса безопасности

export type SecurityItemStatus = 'ok' | 'disabled' | 'no_data' | 'denied' | 'unknown';
export type SecurityItemSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface SecurityItemData {
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

export interface SecurityAccordionFilters {
  search: string;
  statusFilter: 'all' | 'problems_only' | 'no_data_only';
  severityFilter: SecurityItemSeverity | 'all';
  sortBy: 'severity' | 'last_seen' | 'name';
  sortOrder: 'asc' | 'desc';
}

export interface SecurityAccordionState {
  items: SecurityItemData[];
  filters: SecurityAccordionFilters;
  expandedItems: Set<string>;
  loading: boolean;
  error: string | null;
  lastUpdated: string;
  refreshingItems: Set<string>;
}

// Маппинг иконок для разных типов параметров безопасности
export const SECURITY_ITEM_ICONS: Record<string, string> = {
  defender: 'shield',
  firewall_domain: 'shield-check',
  firewall_private: 'shield-check', 
  firewall_public: 'shield-check',
  uac: 'user-check',
  rdp: 'monitor',
  bitlocker: 'lock',
  smb1: 'network',
  windows_update: 'download'
};

// Маппинг названий на русском языке
export const SECURITY_ITEM_NAMES: Record<string, string> = {
  defender: 'Windows Defender',
  firewall_domain: 'Брандмауэр Windows — Domain профиль',
  firewall_private: 'Брандмауэр Windows — Private профиль',
  firewall_public: 'Брандмауэр Windows — Public профиль',
  uac: 'Контроль учетных записей (UAC)',
  rdp: 'Удаленный рабочий стол (RDP)',
  bitlocker: 'Шифрование диска BitLocker',
  smb1: 'Протокол SMB v1',
  windows_update: 'Обновления Windows'
};

// Рекомендации для различных статусов
export const FALLBACK_RECOMMENDATIONS: Record<string, string[]> = {
  no_data: [
    'Проверьте подключение агента к системе',
    'Убедитесь, что агент запущен с правами администратора',
    'Проверьте журналы агента на наличие ошибок'
  ],
  denied: [
    'Запустите агент с правами администратора',
    'Проверьте политики безопасности системы',
    'Убедитесь, что антивирус не блокирует агент'
  ],
  unknown: [
    'Обновите агент до последней версии',
    'Перезапустите агент',
    'Проверьте совместимость с версией ОС'
  ]
};
