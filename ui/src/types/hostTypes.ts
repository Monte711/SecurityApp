// Типы для структуры данных хоста и событий от Go-агента
export interface HostInfo {
  hostname: string;
  host_id: string;
  os: {
    name: string;
    version: string;
    build: string;
  };
  uptime_seconds: number;
}

export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  exe_path: string;
  cmdline: string;
  username: string;
  sha256?: string;
  signature?: {
    status: string;
    publisher?: string;
  };
}

export interface RegistryAutorun {
  root?: string;
  path?: string;
  name?: string;
  value?: string;
}

export interface StartupFolder {
  location?: string;
  file?: string;
  target?: string;
}

export interface ServiceAutorun {
  name?: string;
  display_name?: string;
  path?: string;
  start_mode?: string;
  state?: string;
}

export interface ScheduledTask {
  task_name?: string;
  run_as?: string;
  trigger?: string;
  action?: string;
  status?: string;
}

export interface AutorunItem {
  name?: string;
  command?: string;
  location?: string;
  enabled?: boolean;
}

export interface AutorunsData {
  registry?: RegistryAutorun[];
  startup_folders?: StartupFolder[];
  services_auto?: ServiceAutorun[];
  scheduled_tasks?: ScheduledTask[];
}

export interface SecurityModule {
  name: string;
  status: string;
  enabled: boolean;
  version?: string;
  last_update?: string;
  config?: Record<string, any>;
}

// Строгие типы для статусов безопасности
export type SecurityStatusType = 'enabled' | 'disabled' | 'no_data' | 'access_denied' | 'unknown';

export interface SecurityStatus {
  status: SecurityStatusType;
  displayName: string;
  description: string;
  source: string;           // "API", "Cache", "Agent"
  lastUpdated: string;      // ISO timestamp
  details: Record<string, any>;
  recommendations: string[];
}

export interface SecurityData {
  modules?: SecurityModule[] | null;
  defender?: {
    realtime_enabled?: boolean;
    antivirus_enabled?: boolean;
    engine_version?: string;
    signature_age_days?: number;
    permission?: string;
  };
  firewall?: {
    domain?: {
      enabled?: boolean;
      default_inbound?: string;
    };
    private?: {
      enabled?: boolean;
      default_inbound?: string;
    };
    public?: {
      enabled?: boolean;
      default_inbound?: string;
    };
    permission?: string;
  };
  uac?: {
    enabled?: boolean;
    permission?: string;
  };
  rdp?: {
    enabled?: boolean;
    permission?: string;
  };
  bitlocker?: {
    enabled?: boolean;
    permission?: string;
    volumes?: Array<{
      device_id?: string;
      size?: string;
      conversion_status?: string;
      protection_status?: string;
      encryption_method?: string;
      percentage?: number;
    }>;
  };
  smb1?: {
    enabled?: boolean;
    permission?: string;
  };
}

// Нормализованные данные безопасности для UI
export interface NormalizedSecurityData {
  defender: SecurityStatus;
  firewall: SecurityStatus;
  uac: SecurityStatus;
  rdp: SecurityStatus;
  bitlocker: SecurityStatus;
  smb1: SecurityStatus;
  lastUpdated: string;
}

export interface Finding {
  rule_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message_ru: string;
  evidence: string;
}

export interface InventoryData {
  processes: ProcessInfo[];
  autoruns: AutorunsData;
}

export interface Metadata {
  collector: string;
  schema_version: string;
}

export interface HostPostureEvent {
  event_id: string;
  '@timestamp'?: string;
  received_at: string;
  indexed_at: string;
  index_name: string;
  agent_id: string;
  user_agent: string;
  format_type: string;
  severity: string;
  host_info: HostInfo;
  telemetry: InventoryData; // Изменено с inventory на telemetry (согласно реальной структуре)
  inventory: InventoryData; // Реальная структура данных от агента
  security: SecurityData;
  findings: Finding[];
  metadata: Metadata;
}

export interface HostSummary {
  host_id: string;
  hostname: string;
  status: 'ok' | 'warning' | 'critical';
  last_seen: string;
  findings_count: number;
  severity_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  os?: string; // Упрощено для API response
}

export interface HostsListResponse {
  hosts: HostSummary[];
  total: number;
}

export interface HostDetailResponse {
  host: HostPostureEvent;
  history: HostPostureEvent[];
}

// Mapping для совместимости с существующими типами UI
export interface TelemetryEventCompat {
  event_id: string;
  timestamp: string;
  event_type: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  host?: {
    hostname: string;
    host_id: string;
  };
  tags: string[];
  status: 'new' | 'in_progress' | 'resolved' | 'action_requested';
  raw_data?: any;
}
