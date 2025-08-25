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

export interface AutorunItem {
  name?: string;
  command?: string;
  location?: string;
  enabled?: boolean;
}

export interface AutorunsData {
  startup_programs?: AutorunItem[];
  run_keys?: AutorunItem[];
  services?: AutorunItem[];
  scheduled_tasks?: AutorunItem[];
}

export interface SecurityModule {
  name: string;
  status: string;
  enabled: boolean;
  version?: string;
  last_update?: string;
  config?: Record<string, any>;
}

export interface SecurityData {
  modules: SecurityModule[] | null;
  defender?: {
    enabled: boolean;
    status: string;
    signatures_age_days?: number;
    real_time_protection?: boolean;
  };
  firewall?: {
    domain_profile?: boolean;
    private_profile?: boolean;
    public_profile?: boolean;
  };
  uac?: {
    level: string;
    enabled: boolean;
  };
  rdp?: {
    enabled: boolean;
    port: number;
  };
  bitlocker?: {
    status: string;
    encryption_method?: string;
  };
  smb1?: {
    enabled: boolean;
  };
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
  inventory: InventoryData;
  security: SecurityData;
  findings: Finding[];
  metadata: Metadata;
}

export interface HostSummary {
  host_id: string;
  hostname: string;
  status: 'ok' | 'warning' | 'critical';
  last_seen: string;
  findings_count: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  uptime_seconds: number;
  os: {
    name: string;
    version: string;
  };
  processes_count: number;
  security_score?: number; // 0-100
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
