/**
 * Data adapters for Host Management components
 * Provides fallback logic and safe data normalization
 */

import { 
  ProcessInfo,
  AutorunsData,
  SecurityData,
  HostPostureEvent
} from '../types/hostTypes';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Processes Data Adapter
 */
export class ProcessesAdapter {
  static normalize(rawData: HostPostureEvent): ProcessInfo[] {
    try {
      // Try multiple possible data paths
      const processes = rawData.inventory?.processes || 
                       rawData.telemetry?.processes || 
                       [];

      if (!Array.isArray(processes)) {
        console.warn('Processes data is not an array:', processes);
        return [];
      }

      return processes.map((process: any, index: number) => ({
        pid: this.safeNumber(process.pid, index + 1),
        ppid: this.safeNumber(process.ppid, 0),
        name: this.safeString(process.name, process.exe_path?.split('\\').pop() || `<процесс ${index + 1}>`),
        exe_path: this.safeString(process.exe_path, '<неизвестный путь>'),
        cmdline: this.safeString(process.cmdline, '<нет данных>'),
        username: this.safeString(process.username, '<неизвестно>'),
        sha256: process.sha256 || undefined,
        signature: process.signature ? {
          status: process.signature.status || 'unknown',
          publisher: process.signature.publisher || undefined
        } : undefined
      }));
    } catch (error) {
      console.error('Error normalizing processes data:', error);
      return [];
    }
  }

  private static safeString(value: any, fallback: string): string {
    return (typeof value === 'string' && value.trim().length > 0) ? value : fallback;
  }

  private static safeNumber(value: any, fallback: number): number {
    return (typeof value === 'number' && !isNaN(value)) ? value : fallback;
  }
}

/**
 * Autoruns Data Adapter  
 */
export class AutorunsAdapter {
  static normalize(rawData: HostPostureEvent): AutorunsData {
    try {
      // Try multiple possible data paths
      const autorunsSource = rawData.inventory?.autoruns || 
                            rawData.telemetry?.autoruns || 
                            {};

      const result: AutorunsData = {
        registry: [],
        startup_folders: [],
        services_auto: [],
        scheduled_tasks: []
      };

      // Normalize registry entries
      if (Array.isArray(autorunsSource.registry)) {
        result.registry = autorunsSource.registry.map((item: any, index: number) => ({
          root: this.safeString(item.root, 'HKLM'),
          path: this.safeString(item.path, `<неизвестный путь ${index + 1}>`),
          name: this.safeString(item.name, `<запись ${index + 1}>`),
          value: this.safeString(item.value, '<нет значения>')
        }));
      }

      // Normalize startup folders
      if (Array.isArray(autorunsSource.startup_folders)) {
        result.startup_folders = autorunsSource.startup_folders.map((item: any, index: number) => ({
          location: this.safeString(item.location, '<неизвестное расположение>'),
          file: this.safeString(item.file, `<файл ${index + 1}>`),
          target: this.safeString(item.target, '<нет цели>')
        }));
      }

      // Normalize services
      if (Array.isArray(autorunsSource.services_auto)) {
        result.services_auto = autorunsSource.services_auto.map((item: any, index: number) => ({
          name: this.safeString(item.name, `<служба ${index + 1}>`),
          display_name: this.safeString(item.display_name, item.name || `<служба ${index + 1}>`),
          path: this.safeString(item.path, '<неизвестный путь>'),
          start_mode: this.safeString(item.start_mode, 'Unknown'),
          state: this.safeString(item.state, 'Unknown')
        }));
      }

      // Normalize scheduled tasks
      if (Array.isArray(autorunsSource.scheduled_tasks)) {
        result.scheduled_tasks = autorunsSource.scheduled_tasks.map((item: any, index: number) => ({
          task_name: this.safeString(item.task_name, `<задача ${index + 1}>`),
          run_as: this.safeString(item.run_as, '<неизвестно>'),
          trigger: this.safeString(item.trigger, '<нет триггера>'),
          action: this.safeString(item.action, '<нет действия>'),
          status: this.safeString(item.status, 'Unknown')
        }));
      }

      return result;
    } catch (error) {
      console.error('Error normalizing autoruns data:', error);
      return {
        registry: [],
        startup_folders: [],
        services_auto: [],
        scheduled_tasks: []
      };
    }
  }

  private static safeString(value: any, fallback: string): string {
    return (typeof value === 'string' && value.trim().length > 0) ? value : fallback;
  }
}

/**
 * Security Data Adapter
 */
export class SecurityAdapter {
  static normalize(rawData: HostPostureEvent): SecurityData {
    try {
      const securitySource = rawData.security || {};

      return {
        defender: this.normalizeDefender(securitySource.defender),
        firewall: this.normalizeFirewall(securitySource.firewall),
        uac: this.normalizeUAC(securitySource.uac),
        rdp: this.normalizeRDP(securitySource.rdp),
        bitlocker: this.normalizeBitlocker(securitySource.bitlocker),
        smb1: this.normalizeSMB1(securitySource.smb1),
        windows_update: this.normalizeWindowsUpdate(rawData.windows_update)
      };
    } catch (error) {
      console.error('Error normalizing security data:', error);
      return this.getDefaultSecurityData();
    }
  }

  private static normalizeDefender(defender: any) {
    if (!defender || typeof defender !== 'object') {
      return {
        realtime_enabled: undefined,
        antivirus_enabled: undefined,
        engine_version: undefined,
        signature_age_days: undefined,
        permission: 'access_denied'
      };
    }

    return {
      realtime_enabled: typeof defender.realtime_enabled === 'boolean' ? defender.realtime_enabled : undefined,
      antivirus_enabled: typeof defender.antivirus_enabled === 'boolean' ? defender.antivirus_enabled : undefined,
      engine_version: this.safeString(defender.engine_version, undefined),
      signature_age_days: typeof defender.signature_age_days === 'number' ? defender.signature_age_days : undefined,
      permission: defender.permission || undefined
    };
  }

  private static normalizeFirewall(firewall: any) {
    if (!firewall || typeof firewall !== 'object') {
      return {
        domain: undefined,
        private: undefined,
        public: undefined,
        permission: 'access_denied'
      };
    }

    return {
      domain: firewall.domain ? {
        enabled: typeof firewall.domain.enabled === 'boolean' ? firewall.domain.enabled : undefined,
        default_inbound: this.safeString(firewall.domain.default_inbound, undefined)
      } : undefined,
      private: firewall.private ? {
        enabled: typeof firewall.private.enabled === 'boolean' ? firewall.private.enabled : undefined,
        default_inbound: this.safeString(firewall.private.default_inbound, undefined)
      } : undefined,
      public: firewall.public ? {
        enabled: typeof firewall.public.enabled === 'boolean' ? firewall.public.enabled : undefined,
        default_inbound: this.safeString(firewall.public.default_inbound, undefined)
      } : undefined,
      permission: firewall.permission || undefined
    };
  }

  private static normalizeUAC(uac: any) {
    if (!uac || typeof uac !== 'object') {
      return {
        enabled: undefined,
        permission: 'access_denied'
      };
    }

    return {
      enabled: typeof uac.enabled === 'boolean' ? uac.enabled : undefined,
      permission: uac.permission || undefined
    };
  }

  private static normalizeRDP(rdp: any) {
    if (!rdp || typeof rdp !== 'object') {
      return {
        enabled: undefined,
        permission: 'access_denied'
      };
    }

    return {
      enabled: typeof rdp.enabled === 'boolean' ? rdp.enabled : undefined,
      permission: rdp.permission || undefined
    };
  }

  private static normalizeBitlocker(bitlocker: any) {
    if (!bitlocker || typeof bitlocker !== 'object') {
      return {
        enabled: undefined,
        permission: 'access_denied'
      };
    }

    return {
      enabled: typeof bitlocker.enabled === 'boolean' ? bitlocker.enabled : undefined,
      permission: bitlocker.permission || undefined
    };
  }

  private static normalizeSMB1(smb1: any) {
    if (!smb1 || typeof smb1 !== 'object') {
      return {
        enabled: undefined,
        permission: 'access_denied'
      };
    }

    return {
      enabled: typeof smb1.enabled === 'boolean' ? smb1.enabled : undefined,
      permission: smb1.permission || undefined
    };
  }

  private static normalizeWindowsUpdate(windowsUpdate: any) {
    if (!windowsUpdate || typeof windowsUpdate !== 'object') {
      return {
        last_update_date: null,
        update_service_status: 'unknown',
        pending_updates: null,
        permission: 'access_denied',
        error_message: null
      };
    }

    return {
      last_update_date: this.safeStringOrNull(windowsUpdate.last_update_date),
      update_service_status: this.safeString(windowsUpdate.update_service_status, 'unknown') || 'unknown',
      pending_updates: typeof windowsUpdate.pending_updates === 'number' ? windowsUpdate.pending_updates : null,
      permission: windowsUpdate.permission || 'no_data',
      error_message: this.safeStringOrNull(windowsUpdate.error_message)
    };
  }

  private static safeStringOrNull(value: any): string | null {
    return (typeof value === 'string' && value.trim().length > 0) ? value : null;
  }

  private static safeString(value: any, fallback: string | undefined): string | undefined {
    return (typeof value === 'string' && value.trim().length > 0) ? value : fallback;
  }

  static getDefaultSecurityData(): SecurityData {
    return {
      defender: {
        realtime_enabled: undefined,
        antivirus_enabled: undefined,
        engine_version: undefined,
        signature_age_days: undefined,
        permission: 'no_data'
      },
      firewall: {
        domain: undefined,
        private: undefined,
        public: undefined,
        permission: 'no_data'
      },
      uac: {
        enabled: undefined,
        permission: 'no_data'
      },
      rdp: {
        enabled: undefined,
        permission: 'no_data'
      },
      bitlocker: {
        enabled: undefined,
        permission: 'no_data'
      },
      smb1: {
        enabled: undefined,
        permission: 'no_data'
      },
      windows_update: {
        last_update_date: undefined,
        update_service_status: 'unknown',
        pending_updates: undefined,
        permission: 'no_data',
        error_message: undefined
      }
    };
  }
}

/**
 * API Functions with adapters
 */
export async function getHostProcesses(hostId: string): Promise<ProcessInfo[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/host/${hostId}/posture/latest`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const event: HostPostureEvent = await response.json();
    return ProcessesAdapter.normalize(event);
  } catch (error) {
    console.error('Error fetching host processes:', error);
    return [];
  }
}

export async function getHostAutoruns(hostId: string): Promise<AutorunsData> {
  try {
    const response = await fetch(`${API_BASE_URL}/host/${hostId}/posture/latest`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const event: HostPostureEvent = await response.json();
    return AutorunsAdapter.normalize(event);
  } catch (error) {
    console.error('Error fetching host autoruns:', error);
    return {
      registry: [],
      startup_folders: [],
      services_auto: [],
      scheduled_tasks: []
    };
  }
}

export async function getHostSecurity(hostId: string): Promise<SecurityData> {
  try {
    const response = await fetch(`${API_BASE_URL}/host/${hostId}/posture/latest`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const event: HostPostureEvent = await response.json();
    return SecurityAdapter.normalize(event);
  } catch (error) {
    console.error('Error fetching host security:', error);
    return SecurityAdapter.getDefaultSecurityData();
  }
}
