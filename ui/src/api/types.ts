export interface HostInfo {
  host_id: string;
  hostname: string;
  domain?: string;
  os_version?: string;
  ip_addresses?: string[];
}

export interface AgentInfo {
  agent_version: string;
  collect_level: 'minimal' | 'standard' | 'detailed';
}

export interface ProcessInfo {
  pid?: number;
  ppid?: number;
  name?: string;
  path?: string;
  command_line?: string;
  user?: string;
}

export interface FileInfo {
  path?: string;
  name?: string;
  size?: number;
  created?: string;
  modified?: string;
}

export interface NetworkInfo {
  protocol?: string;
  source_ip?: string;
  source_port?: number;
  destination_ip?: string;
  destination_port?: number;
  bytes_sent?: number;
  bytes_received?: number;
}

export interface TelemetryEvent {
  event_id: string;
  event_type: string; // Изменено с enum на string для поддержки событий безопасности
  timestamp: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  severity_ru?: string; // Добавлено для русской локализации
  host?: HostInfo; // Изменено на optional для событий безопасности
  agent?: AgentInfo; // Изменено на optional для событий безопасности
  
  // Поля для событий безопасности
  source?: string; // Источник события безопасности
  description?: string; // Описание события
  
  // Optional fields based on event type
  process?: ProcessInfo;
  file?: FileInfo;
  network?: NetworkInfo;
  raw_data?: Record<string, any>;
  tags?: string[];
  
  // Additional fields for API response
  received_at?: string;
  agent_id?: string;
  user_agent?: string;
  indexed_at?: string;
  index_name?: string;
  _id?: string;
  _index?: string;
  
  // Status for UI - optional field
  status?: 'new' | 'investigating' | 'action_requested' | 'resolved';
  
  // Formatted details for better UI display
  details?: Record<string, any>;
}

export interface EventsResponse {
  events: TelemetryEvent[];
  total: number;
  page: number;
  size: number;
}

export interface IngestResponse {
  event_id: string;
  status: string;
  message?: string;
  processing_time_ms?: number;
  success?: boolean;
  errors?: string[];
}

export interface PlaybookExecution {
  playbook_id: string;
  target_host?: string;
  parameters?: Record<string, any>;
  triggered_by: string;
  approval_required?: boolean;
}

export interface DashboardStats {
  total_events: number;
  unique_hosts: number;
  event_types: Array<{key: string; doc_count: number}>;
  severity_levels: Array<{key: string; doc_count: number}>;
  events_per_hour: Array<{key: number; doc_count: number}>;
}
