import { 
  HostsListResponse, 
  HostDetailResponse, 
  HostPostureEvent, 
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
   * Получить список хостов
   */
  async getHosts(): Promise<HostsListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/hosts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch hosts:', error);
      throw error;
    }
  }

  /**
   * Получить детали хоста
   */
  async getHostDetails(hostId: string): Promise<HostDetailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/hosts/${hostId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch host details:', error);
      throw error;
    }
  }

  /**
   * Получить позицию хоста (совместимость)
   */
  async getHostPosture(hostId: string): Promise<HostDetailResponse> {
    return this.getHostDetails(hostId);
  }

  /**
   * Получить данные безопасности хоста
   */
  async getHostSecurity(hostId: string): Promise<SecurityData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/hosts/${hostId}/security`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      throw error;
    }
  }

  /**
   * Получить процессы хоста
   */
  async getHostProcesses(hostId: string): Promise<ProcessInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/hosts/${hostId}/processes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch processes:', error);
      throw error;
    }
  }

  /**
   * Получить данные автозапуска хоста
   */
  async getHostAutoruns(hostId: string): Promise<AutorunsData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/hosts/${hostId}/autoruns`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch autoruns:', error);
      throw error;
    }
  }

  /**
   * Получить события хоста
   */
  async getHostEvents(hostId: string, limit?: number): Promise<HostPostureEvent[]> {
    try {
      const url = limit ? 
        `${this.baseUrl}/api/hosts/${hostId}/events?limit=${limit}` : 
        `${this.baseUrl}/api/hosts/${hostId}/events`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch events:', error);
      throw error;
    }
  }

  /**
   * Получить уязвимости хоста
   */
  async getHostFindings(hostId: string): Promise<Finding[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/hosts/${hostId}/findings`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch findings:', error);
      throw error;
    }
  }
}

export const hostApiClient = new HostApiClient();
