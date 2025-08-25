import { 
  HostsListResponse, 
  HostDetailResponse, 
  HostPostureEvent, 
  TelemetryEventCompat,
  ProcessInfo,
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
      // Получаем все события и группируем по хостам
      const response = await fetch(`${this.baseUrl}/events?limit=100`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const events = data.events || [];

      // Группируем события по хостам и создаем сводку
      const hostsMap = new Map();
      
      events.forEach((event: any) => {
        if (event.host_info && event.host_info.host_id) {
          const hostId = event.host_info.host_id;
          const hostname = event.host_info.hostname;
          
          if (!hostsMap.has(hostId)) {
            // Подсчитываем findings по severity
            const findingsCounts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
            
            if (event.findings && Array.isArray(event.findings)) {
              event.findings.forEach((finding: Finding) => {
                findingsCounts[finding.severity] = (findingsCounts[finding.severity] || 0) + 1;
                findingsCounts.total++;
              });
            }

            // Определяем статус хоста на основе findings
            let status: 'ok' | 'warning' | 'critical' = 'ok';
            if (findingsCounts.critical > 0) status = 'critical';
            else if (findingsCounts.high > 0) status = 'critical';
            else if (findingsCounts.medium > 0) status = 'warning';

            hostsMap.set(hostId, {
              host_id: hostId,
              hostname: hostname,
              status: status,
              last_seen: event.received_at || event['@timestamp'] || new Date().toISOString(),
              findings_count: findingsCounts,
              uptime_seconds: event.host_info.uptime_seconds || 0,
              os: {
                name: event.host_info.os?.name || 'Unknown',
                version: event.host_info.os?.version || 'Unknown'
              },
              processes_count: event.inventory?.processes?.length || 0,
              security_score: this.calculateSecurityScore(event)
            });
          }
        }
      });

      return {
        hosts: Array.from(hostsMap.values()),
        total: hostsMap.size
      };
    } catch (error) {
      console.error('Failed to fetch hosts:', error);
      return { hosts: [], total: 0 };
    }
  }

  /**
   * Получить детальную информацию о хосте
   */
  async getHostDetail(hostId: string): Promise<HostDetailResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/events?limit=50&host_id=${hostId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const events = data.events || [];

      if (events.length === 0) {
        return null;
      }

      // Последнее событие как текущее состояние
      const latestEvent = events[0];
      
      return {
        host: latestEvent,
        history: events
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
      return posture?.inventory?.autoruns || {};
    } catch (error) {
      console.error('Failed to fetch host autoruns:', error);
      return {};
    }
  }

  /**
   * Получить параметры безопасности для хоста
   */
  async getHostSecurity(hostId: string): Promise<SecurityData> {
    try {
      const posture = await this.getHostPosture(hostId);
      return posture?.security || { modules: null };
    } catch (error) {
      console.error('Failed to fetch host security:', error);
      return { modules: null };
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
  private calculateSecurityScore(event: any): number {
    let score = 100;

    // Штрафы за findings
    if (event.findings && Array.isArray(event.findings)) {
      event.findings.forEach((finding: Finding) => {
        switch (finding.severity) {
          case 'critical':
            score -= 30;
            break;
          case 'high':
            score -= 15;
            break;
          case 'medium':
            score -= 5;
            break;
          case 'low':
            score -= 1;
            break;
        }
      });
    }

    return Math.max(0, Math.min(100, score));
  }

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
