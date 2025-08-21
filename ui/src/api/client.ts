import { TelemetryEvent, IngestResponse, DashboardStats, PlaybookExecution, EventsResponse } from './types';
import { mockEvents, mockStats, mockLogs } from './mocks';

class ApiClient {
  private baseUrl: string;
  private useMock: boolean;
  private events: TelemetryEvent[] = [...mockEvents];
  private logs = [...mockLogs];

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    this.useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    console.log('ApiClient initialized:', { baseUrl: this.baseUrl, useMock: this.useMock });
  }

  setConfig(baseUrl: string, useMock: boolean) {
    this.baseUrl = baseUrl;
    this.useMock = useMock;
  }

  getConfig() {
    return {
      baseUrl: this.baseUrl,
      useMock: this.useMock
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.useMock) {
      // Simulate successful connection test
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Mock connection successful'
          });
        }, 500);
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful'
        };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async ingestEvent(event: TelemetryEvent): Promise<IngestResponse> {
    if (this.useMock) {
      // Add to mock events list
      this.events.unshift({
        ...event,
        status: 'new'
      });
      
      // Add to logs
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'event_imported',
        details: `Imported event ${event.event_id} (${event.event_type})`,
        user: 'operator'
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            status: 'accepted',
            event_id: event.event_id,
            message: 'Event ingested successfully (mock)'
          });
        }, 300);
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-ID': 'ui-dashboard-001'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log successful ingestion
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'event_imported',
        details: `Imported event ${event.event_id} (${event.event_type}) - Status: ${result.status}`,
        user: 'operator'
      });

      return {
        success: result.status === 'accepted',
        status: result.status,
        event_id: result.event_id,
        message: result.message || 'Event processed successfully',
        processing_time_ms: result.processing_time_ms
      };
    } catch (error) {
      console.error('Ingest error:', error);
      return {
        success: false,
        status: 'error',
        event_id: event.event_id,
        message: `Ingest failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async getEvents(filters?: {
    event_type?: string;
    host_id?: string;
    severity?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<EventsResponse> {
    if (this.useMock) {
      let filteredEvents = [...this.events];

      // Apply filters
      if (filters?.event_type) {
        filteredEvents = filteredEvents.filter(e => e.event_type === filters.event_type);
      }
      if (filters?.host_id) {
        filteredEvents = filteredEvents.filter(e => 
          e.host?.hostname?.toLowerCase().includes(filters.host_id!.toLowerCase()) || 
          e.source?.toLowerCase().includes(filters.host_id!.toLowerCase())
        );
      }
      if (filters?.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
      }
      if (filters?.date_from) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.date_from!);
      }
      if (filters?.date_to) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.date_to!);
      }

      // Sort by timestamp descending
      filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const start = (page - 1) * limit;
      const end = start + limit;

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            events: filteredEvents.slice(start, end),
            total: filteredEvents.length,
            page,
            size: Math.min(limit, filteredEvents.length - start)
          });
        }, 200);
      });
    }

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.event_type) params.append('event_type', filters.event_type);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.host_id) params.append('host_id', filters.host_id);

      const url = `${this.baseUrl}/events?${params.toString()}`;
      console.log('=== API CLIENT DEBUG ===');
      console.log('Base URL:', this.baseUrl);
      console.log('Full URL:', url);
      console.log('Use Mock:', this.useMock);

      // Use events endpoint for real data
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      // Return the API response directly since it matches our EventsResponse type
      return {
        events: result.events || [],
        total: result.total || 0,
        page: result.page || 1,
        size: result.size || 0
      };

    } catch (error) {
      console.error('=== API CLIENT ERROR ===', error);
      return { 
        events: [], 
        total: 0, 
        page: 1, 
        size: 0 
      };
    }
  }

  async getEventDetails(eventId: string): Promise<TelemetryEvent | null> {
    if (this.useMock) {
      const event = this.events.find(e => e.event_id === eventId);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(event || null);
        }, 100);
      });
    }

    // Real API call would go here
    return null;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    if (this.useMock) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ...mockStats,
            total_events: this.events.length
          });
        }, 150);
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Stats endpoint not available, using fallback');
        return mockStats;
      }

      const result = await response.json();
      
      // Return the API response directly since it matches our DashboardStats format
      return {
        total_events: result.total_events || 0,
        unique_hosts: result.unique_hosts || 0,
        event_types: result.event_types || [],
        severity_levels: result.severity_levels || [],
        events_per_hour: result.events_per_hour || []
      };

    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return mockStats;
    }
  }

  async executePlaybook(execution: PlaybookExecution): Promise<{ success: boolean; message: string }> {
    if (this.useMock) {
      // Update event status if target specified
      if (execution.target_host) {
        const event = this.events.find(e => e.host?.hostname === execution.target_host);
        if (event) {
          event.status = 'action_requested';
        }
      }

      // Add to logs
      this.logs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'playbook_executed',
        details: `Executed '${execution.playbook_id}' ${execution.target_host ? `for host ${execution.target_host}` : ''}`,
        user: execution.triggered_by
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: `Playbook '${execution.playbook_id}' executed successfully (mock)`
          });
        }, 400);
      });
    }

    // Real API call would go here
    return { success: false, message: 'Real API not implemented' };
  }

  async updateEventStatus(eventId: string, status: TelemetryEvent['status']): Promise<{ success: boolean }> {
    if (this.useMock) {
      const event = this.events.find(e => e.event_id === eventId);
      if (event) {
        event.status = status;
        
        this.logs.unshift({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'status_changed',
          details: `Changed status of ${eventId} to '${status}'`,
          user: 'operator'
        });
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 100);
      });
    }

    return { success: false };
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; message: string }> {
    if (this.useMock) {
      const eventIndex = this.events.findIndex(e => e.event_id === eventId);
      if (eventIndex !== -1) {
        this.events.splice(eventIndex, 1);
        
        this.logs.unshift({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'event_deleted',
          details: `Deleted event ${eventId}`,
          user: 'operator'
        });

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, message: 'Событие успешно удалено' });
          }, 200);
        });
      } else {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: false, message: 'Событие не найдено' });
          }, 200);
        });
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || 'Событие успешно удалено'
      };

    } catch (error) {
      console.error('Failed to delete event:', error);
      return {
        success: false,
        message: `Ошибка удаления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      };
    }
  }

  getLogs(limit: number = 10) {
    return this.logs.slice(0, limit);
  }
}

export const apiClient = new ApiClient();
