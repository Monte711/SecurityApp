import { 
  HostsListResponse, 
  HostPostureEvent, 
  ProcessInfo,
  AutorunsData,
  SecurityData,
  Finding
} from '../types/hostTypes';
import { ProcessesAdapter, AutorunsAdapter, SecurityAdapter } from './dataAdapters';

export class HostApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = window.location.origin;
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
   * Получить детали хоста - используем правильный API endpoint
   */
  async getHostDetails(hostId: string): Promise<HostPostureEvent> {
    try {
      const response = await fetch(`${this.baseUrl}/api/host/${hostId}/posture/latest`);
      if (!response.ok) {
        throw new Error(`Failed to fetch host details: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching host details:', error);
      throw error;
    }
  }

  /**
   * Получить позицию хоста (совместимость)
   */
  async getHostPosture(hostId: string): Promise<HostPostureEvent> {
    return this.getHostDetails(hostId);
  }

  /**
   * Получить данные безопасности хоста с нормализацией
   */
  async getHostSecurity(hostId: string): Promise<SecurityData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/host/${hostId}/posture/latest`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Используем адаптер для нормализации данных безопасности
      return SecurityAdapter.normalize(data);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      throw error;
    }
  }

  /**
   * Получить процессы хоста с нормализацией
   */
  async getHostProcesses(hostId: string): Promise<ProcessInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/host/${hostId}/posture/latest`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Используем адаптер для нормализации данных процессов
      return ProcessesAdapter.normalize(data);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
      // Возвращаем пустой массив вместо выбрасывания ошибки
      return [];
    }
  }

  /**
   * Получить данные автозапуска хоста с нормализацией
   */
  async getHostAutoruns(hostId: string): Promise<AutorunsData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/host/${hostId}/posture/latest`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Используем адаптер для нормализации данных автозапуска
      return AutorunsAdapter.normalize(data);
    } catch (error) {
      console.error('Failed to fetch autoruns:', error);
      // Возвращаем пустую структуру вместо выбрасывания ошибки
      return {
        registry: [],
        startup_folders: [],
        services_auto: [],
        scheduled_tasks: []
      };
    }
  }

  /**
   * Получить события хоста
   */
  async getHostEvents(hostId: string): Promise<HostPostureEvent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/host/${hostId}/posture/latest`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return [data]; // возвращаем последнее событие как массив
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
      const response = await fetch(`${this.baseUrl}/api/host/${hostId}/posture/latest`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.findings || [];
    } catch (error) {
      console.error('Failed to fetch findings:', error);
      throw error;
    }
  }
}

export const hostApiClient = new HostApiClient();
