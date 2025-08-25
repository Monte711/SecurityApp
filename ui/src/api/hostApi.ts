import { 
  HostsListResponse, 
  HostDetailResponse, 
  HostPostureEvent, 
  TelemetryEventCompat,
  ProcessInfo,
  AutorunItem,
  AutorunsData,
  SecurityData,
  Finding
} from '../types/hostTypes';

export class HostApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * Получить список всех хостов с краткой сводкой
   */
  async getHosts(): Promise<HostsListResponse> {
    try {
      // Используем новый endpoint /api/hosts
      const response = await fetch(`${this.baseUrl}/api/hosts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        hosts: data.hosts || [],
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error fetching hosts:', error);
      return { hosts: [], total: 0 };
    }
  }

  /**
   * Получить детальную информацию о хосте
   */
  async getHostDetail(hostId: string): Promise<HostDetailResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/host/${hostId}/posture/latest`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const hostData = await response.json();
      
      return {
        host: hostData,
        history: [hostData] // Для совместимости, пока возвращаем только последнее состояние
      };
    } catch (error) {
      console.error('Failed to fetch host details:', error);
      return null;
    }
  }

  /**
   * Получить последнее состояние хоста (host posture)
   */
  async getHostPosture(hostId: string): Promise<HostPostureEvent | null> {
    try {
      const detail = await this.getHostDetail(hostId);
      return detail?.host || null;
    } catch (error) {
      console.error('Failed to fetch host posture:', error);
      return null;
    }
  }

  /**
   * Получить процессы для хоста
   */
  async getHostProcesses(hostId: string): Promise<ProcessInfo[]> {
    try {
      const posture = await this.getHostPosture(hostId);
      return posture?.inventory?.processes || [];
    } catch (error) {
      console.error('Failed to fetch host processes:', error);
      return [];
    }
  }

  /**
   * Получить автозапуски для хоста
   */
  async getHostAutoruns(hostId: string): Promise<AutorunsData> {
    try {
      const posture = await this.getHostPosture(hostId);
      
      if (!posture?.inventory?.autoruns) {
        return {
          startup_programs: [],
          run_keys: [],
          services: [],
          scheduled_tasks: []
        };
      }

      const autoruns = posture.inventory.autoruns;
      
      // Функция для парсинга PowerShell объектов в строковом формате
      const parseAutorunArray = (items: any[]): AutorunItem[] => {
        if (!items) return [];
        
        return items.map(item => {
          if (typeof item === 'string' && item.startsWith('@{')) {
            // Парсинг PowerShell объекта "@{name=value; command=value; ...}"
            const parsed: AutorunItem = {};
            const content = item.slice(2, -1); // Убираем @{ и }
            const pairs = content.split(';').map(s => s.trim());
            
            pairs.forEach(pair => {
              const [key, ...valueParts] = pair.split('=');
              const value = valueParts.join('=').trim();
              if (key && value && value !== '') {
                (parsed as any)[key.trim()] = value;
              }
            });
            
            return parsed;
          } else if (typeof item === 'object' && item !== null) {
            return item as AutorunItem;
          }
          return {};
        }).filter(item => Object.keys(item).length > 0);
      };

      return {
        startup_programs: parseAutorunArray(autoruns.startup_programs || []),
        run_keys: parseAutorunArray(autoruns.run_keys || []),
        services: parseAutorunArray(autoruns.services || []),
        scheduled_tasks: parseAutorunArray(autoruns.scheduled_tasks || [])
      };
    } catch (error) {
      console.error('Failed to fetch host autoruns:', error);
      return {
        startup_programs: [],
        run_keys: [],
        services: [],
        scheduled_tasks: []
      };
    }
  }

  /**
   * Получить параметры безопасности для хоста
   */
  async getHostSecurity(hostId: string): Promise<SecurityData> {
    try {
      const posture = await this.getHostPosture(hostId);
      
      if (!posture) {
        return { modules: [] };
      }

      // Создаем SecurityData на основе findings
      const findings = posture.findings || [];
      const securityData: SecurityData = {
        modules: [],
        defender: undefined,
        firewall: undefined,
        uac: undefined,
        rdp: undefined,
        bitlocker: undefined,
        smb1: undefined
      };

      // Анализируем findings для создания структуры безопасности
      findings.forEach(finding => {
        switch (finding.rule_id) {
          case 'BITLOCKER_OFF':
            securityData.bitlocker = {
              status: 'disabled',
              encryption_method: undefined
            };
            break;
          case 'SMB1_ENABLED':
            securityData.smb1 = {
              enabled: true
            };
            break;
          case 'DEFENDER_OFF':
            securityData.defender = {
              enabled: false,
              status: 'disabled',
              real_time_protection: false
            };
            break;
          case 'FIREWALL_OFF':
            securityData.firewall = {
              domain_profile: false,
              private_profile: false,
              public_profile: false
            };
            break;
          case 'UAC_OFF':
            securityData.uac = {
              level: 'disabled',
              enabled: false
            };
            break;
          case 'RDP_ENABLED':
            securityData.rdp = {
              enabled: true,
              port: 3389
            };
            break;
        }
      });

      // Если нет негативных findings, предполагаем, что параметры в порядке
      if (!findings.some(f => f.rule_id === 'BITLOCKER_OFF')) {
        securityData.bitlocker = {
          status: 'enabled',
          encryption_method: 'AES-256'
        };
      }

      if (!findings.some(f => f.rule_id === 'SMB1_ENABLED')) {
        securityData.smb1 = {
          enabled: false
        };
      }

      // Добавляем модули безопасности на основе доступных данных
      if (securityData.defender) {
        securityData.modules?.push({
          name: 'Windows Defender',
          status: securityData.defender.enabled ? 'enabled' : 'disabled',
          enabled: securityData.defender.enabled,
          version: 'Unknown'
        });
      }

      if (securityData.firewall) {
        const firewallEnabled = securityData.firewall.domain_profile || securityData.firewall.private_profile || securityData.firewall.public_profile;
        securityData.modules?.push({
          name: 'Windows Firewall',
          status: firewallEnabled ? 'enabled' : 'disabled',
          enabled: !!firewallEnabled,
          version: 'Unknown'
        });
      }

      return securityData;
    } catch (error) {
      console.error('Failed to fetch host security:', error);
      return { modules: [] };
    }
  }

  /**
   * Получить findings для хоста
   */
  async getHostFindings(hostId: string): Promise<Finding[]> {
    try {
      const posture = await this.getHostPosture(hostId);
      return posture?.findings || [];
    } catch (error) {
      console.error('Failed to fetch host findings:', error);
      return [];
    }
  }

  /**
   * Адаптер для совместимости с существующим UI
   * Конвертирует HostPostureEvent в TelemetryEventCompat
   */
  convertHostEventToTelemetryEvent(hostEvent: HostPostureEvent): TelemetryEventCompat {
    return {
      event_id: hostEvent.event_id,
      timestamp: hostEvent.received_at || hostEvent['@timestamp'] || new Date().toISOString(),
      event_type: 'host_posture',
      source: `${hostEvent.agent_id} (${hostEvent.user_agent})`,
      severity: this.mapSeverity(hostEvent.severity),
      description: this.generateDescription(hostEvent),
      host: {
        hostname: hostEvent.host_info.hostname,
        host_id: hostEvent.host_info.host_id
      },
      tags: this.generateTags(hostEvent),
      status: 'new',
      raw_data: hostEvent
    };
  }

  /**
   * Получить события в формате совместимости
   */
  async getEventsCompat(filters?: {
    host_id?: string;
    severity?: string;
    limit?: number;
    page?: number;
  }): Promise<{ events: TelemetryEventCompat[]; total: number; page: number; size: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.host_id) params.append('host_id', filters.host_id);
      if (filters?.severity) params.append('severity', filters.severity);

      const response = await fetch(`${this.baseUrl}/events?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const convertedEvents = (data.events || []).map((event: any) => 
        this.convertHostEventToTelemetryEvent(event)
      );

      return {
        events: convertedEvents,
        total: data.total || 0,
        page: data.page || 1,
        size: data.size || 0
      };
    } catch (error) {
      console.error('Failed to fetch events (compat):', error);
      return { events: [], total: 0, page: 1, size: 0 };
    }
  }

  // Вспомогательные методы

  private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'info';
    }
  }

  private generateDescription(hostEvent: HostPostureEvent): string {
    const processCount = hostEvent.inventory?.processes?.length || 0;
    const findingsCount = hostEvent.findings?.length || 0;
    
    let desc = `Состояние хоста ${hostEvent.host_info.hostname}: `;
    desc += `${processCount} процессов, ${findingsCount} рекомендаций`;
    
    if (findingsCount > 0) {
      const highFindings = hostEvent.findings.filter(f => f.severity === 'high' || f.severity === 'critical').length;
      if (highFindings > 0) {
        desc += ` (включая ${highFindings} критических)`;
      }
    }

    return desc;
  }

  private generateTags(hostEvent: HostPostureEvent): string[] {
    const tags = [
      'host_posture',
      hostEvent.host_info.os.name.toLowerCase().replace(/\s+/g, '_')
    ];

    if (hostEvent.findings && hostEvent.findings.length > 0) {
      tags.push('has_findings');
    }

    if (hostEvent.inventory?.processes && hostEvent.inventory.processes.length > 0) {
      tags.push('processes_collected');
    }

    if (hostEvent.inventory?.autoruns) {
      tags.push('autoruns_collected');
    }

    return tags;
  }
}

export const hostApiClient = new HostApiClient();
