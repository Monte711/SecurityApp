import { TelemetryEvent, DashboardStats } from './types';

// Mock data for development
export const mockEvents: TelemetryEvent[] = [
  {
    event_id: "evt-001",
    timestamp: "2025-08-20T14:30:00Z",
    event_type: "security_alert",
    severity: "critical",
    host: {
      host_id: "host-001",
      hostname: "workstation-01",
      domain: "corp.local",
      os_version: "Windows 11 Pro",
      ip_addresses: ["192.168.1.100"]
    },
    agent: {
      agent_version: "1.0.0",
      collect_level: "detailed"
    },
    raw_data: { 
      alert_name: "Malware Detection",
      description: "Suspicious process execution detected",
      confidence: 95 
    },
    tags: ["malware", "critical"],
    status: "new"
  },
  {
    event_id: "evt-002", 
    timestamp: "2025-08-20T14:25:00Z",
    event_type: "process_start",
    severity: "high",
    host: {
      host_id: "host-002",
      hostname: "server-db",
      domain: "corp.local",
      os_version: "Windows Server 2022",
      ip_addresses: ["192.168.1.50"]
    },
    agent: {
      agent_version: "1.0.0",
      collect_level: "standard"
    },
    process: {
      pid: 1234,
      name: "powershell.exe",
      command_line: "powershell.exe -enc SQBuAHYAbwBrAGU=",
      user: "system"
    },
    tags: ["suspicious", "powershell"],
    status: "investigating"
  },
  {
    event_id: "evt-003",
    timestamp: "2025-08-20T14:20:00Z", 
    event_type: "file_create",
    severity: "medium",
    host: {
      host_id: "host-003",
      hostname: "workstation-02", 
      domain: "corp.local",
      os_version: "Windows 10 Pro",
      ip_addresses: ["192.168.1.101"]
    },
    agent: {
      agent_version: "1.0.0",
      collect_level: "standard"
    },
    file: {
      path: "C:\\temp\\suspicious.exe",
      name: "suspicious.exe",
      size: 1048576,
      created: "2025-08-20T14:20:00Z"
    },
    raw_data: { 
      quarantined: false,
      hash: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
    },
    tags: ["file", "temp"],
    status: "new"
  },
  {
    event_id: "evt-004",
    timestamp: "2025-08-20T14:15:00Z",
    event_type: "network_connection", 
    severity: "low",
    host: {
      host_id: "host-004",
      hostname: "workstation-03",
      domain: "corp.local", 
      os_version: "Windows 11 Pro",
      ip_addresses: ["192.168.1.102"]
    },
    agent: {
      agent_version: "1.0.0",
      collect_level: "minimal"
    },
    network: {
      protocol: "HTTPS",
      source_ip: "192.168.1.102",
      source_port: 54321,
      destination_ip: "198.51.100.1",
      destination_port: 443,
      bytes_sent: 1024,
      bytes_received: 2048
    },
    tags: ["network", "external"],
    status: "resolved"
  },
  {
    event_id: "evt-005",
    timestamp: "2025-08-20T14:10:00Z",
    event_type: "user_login",
    severity: "medium",
    host: {
      host_id: "host-005", 
      hostname: "dc-01",
      domain: "corp.local",
      os_version: "Windows Server 2022",
      ip_addresses: ["192.168.1.10"]
    },
    agent: {
      agent_version: "1.0.0",
      collect_level: "detailed"
    },
    raw_data: { 
      user: "admin",
      source_ip: "192.168.1.200",
      failed_attempts: 3
    },
    tags: ["authentication", "admin"],
    status: "new"
  }
];

export const mockStats: DashboardStats = {
  total_events: 2847,
  unique_hosts: 45,
  event_types: [
    { key: "process_start", doc_count: 1024 },
    { key: "file_create", doc_count: 567 },
    { key: "network_connection", doc_count: 892 },
    { key: "user_login", doc_count: 234 },
    { key: "security_alert", doc_count: 130 }
  ],
  severity_levels: [
    { key: "info", doc_count: 1200 },
    { key: "low", doc_count: 800 },
    { key: "medium", doc_count: 600 },
    { key: "high", doc_count: 200 },
    { key: "critical", doc_count: 47 }
  ],
  events_per_hour: [
    { key: 1724162400000, doc_count: 120 },
    { key: 1724166000000, doc_count: 95 },
    { key: 1724169600000, doc_count: 150 },
    { key: 1724173200000, doc_count: 80 }
  ]
};

export const mockPlaybooks = [
  {
    id: "notify_operator",
    name: "Notify Security Operator",
    description: "Send alert notification to security team"
  },
  {
    id: "quarantine_host", 
    name: "Quarantine Host",
    description: "Isolate host from network"
  },
  {
    id: "block_process",
    name: "Block Process",
    description: "Terminate and block suspicious process"
  }
];

export const mockLogs = [
  {
    id: "log-001",
    timestamp: "2025-08-20T14:35:00Z",
    action: "playbook_executed",
    details: "Executed 'notify_operator' for event evt-001",
    user: "operator"
  },
  {
    id: "log-002", 
    timestamp: "2025-08-20T14:32:00Z",
    action: "event_imported",
    details: "Imported event from uploaded JSON file",
    user: "operator"
  },
  {
    id: "log-003",
    timestamp: "2025-08-20T14:30:00Z", 
    action: "status_changed",
    details: "Changed status of evt-002 to 'investigating'",
    user: "operator"
  }
];
