import { 
  SecurityData,
  NormalizedSecurityData,
  SecurityStatus,
  SecurityStatusType
} from '../types/hostTypes';
import { hostApiClient } from './hostApi';

export class SecurityDataNormalizer {
  /**
   * Получить нормализованные данные безопасности для хоста
   */
  async getNormalizedHostSecurity(hostId: string): Promise<NormalizedSecurityData> {
    try {
      const rawData = await hostApiClient.getHostSecurity(hostId);
      return this.normalizeSecurityData(rawData);
    } catch (error) {
      console.error('Failed to fetch normalized host security:', error);
      return this.getEmptySecurityData();
    }
  }

  /**
   * Строгая нормализация данных безопасности
   */
  private normalizeSecurityData(rawData: SecurityData): NormalizedSecurityData {
    const now = new Date().toISOString();
    
    return {
      defender: this.normalizeDefenderStatus(rawData.defender, now),
      firewall: this.normalizeFirewallStatus(rawData.firewall, now),
      uac: this.normalizeUACStatus(rawData.uac, now),
      rdp: this.normalizeRDPStatus(rawData.rdp, now),
      bitlocker: this.normalizeBitLockerStatus(rawData.bitlocker, now),
      smb1: this.normalizeSMB1Status(rawData.smb1, now),
      lastUpdated: now
    };
  }

  private normalizeDefenderStatus(data: any, timestamp: string): SecurityStatus {
    if (!data) {
      return {
        status: 'no_data',
        displayName: 'Windows Defender',
        description: 'Данные о Windows Defender недоступны',
        source: 'API',
        lastUpdated: timestamp,
        details: {},
        recommendations: ['Проверьте подключение к агенту']
      };
    }

    if (data.permission === 'denied' || data.permission === 'access_denied') {
      return {
        status: 'access_denied',
        displayName: 'Windows Defender',
        description: 'Недостаточно прав для проверки Windows Defender',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Права доступа': data.permission },
        recommendations: ['Запустите агент с правами администратора']
      };
    }

    const antivirusEnabled = data.antivirus_enabled;
    const realtimeEnabled = data.realtime_enabled;

    // Строгая проверка значений
    if (antivirusEnabled === null || antivirusEnabled === undefined ||
        realtimeEnabled === null || realtimeEnabled === undefined) {
      return {
        status: 'unknown',
        displayName: 'Windows Defender',
        description: 'Неопределённое состояние Windows Defender',
        source: 'Agent',
        lastUpdated: timestamp,
        details: {
          'Антивирус': antivirusEnabled === null ? 'null' : String(antivirusEnabled),
          'Защита в реальном времени': realtimeEnabled === null ? 'null' : String(realtimeEnabled)
        },
        recommendations: ['Обратитесь к администратору']
      };
    }

    // Определяем статус на основе данных
    let status: SecurityStatusType;
    let recommendations: string[] = [];

    if (!antivirusEnabled) {
      status = 'disabled';
      recommendations.push('Включите Windows Defender для базовой защиты');
    } else if (!realtimeEnabled) {
      status = 'disabled'; // Считаем отключенным если нет защиты в реальном времени
      recommendations.push('Включите защиту в реальном времени');
    } else {
      status = 'enabled';
    }

    return {
      status,
      displayName: 'Windows Defender',
      description: 'Антивирусная защита Windows',
      source: 'Agent',
      lastUpdated: timestamp,
      details: {
        'Антивирус': antivirusEnabled ? 'Включен' : 'Отключен',
        'Защита в реальном времени': realtimeEnabled ? 'Включена' : 'Отключена',
        'Версия движка': data.engine_version || 'Неизвестно'
      },
      recommendations
    };
  }

  private normalizeFirewallStatus(data: any, timestamp: string): SecurityStatus {
    if (!data) {
      return {
        status: 'no_data',
        displayName: 'Брандмауэр Windows',
        description: 'Данные о брандмауэре недоступны',
        source: 'API',
        lastUpdated: timestamp,
        details: {},
        recommendations: ['Проверьте подключение к агенту']
      };
    }

    if (data.permission === 'denied' || data.permission === 'access_denied') {
      return {
        status: 'access_denied',
        displayName: 'Брандмауэр Windows',
        description: 'Недостаточно прав для проверки брандмауэра',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Права доступа': data.permission },
        recommendations: ['Запустите агент с правами администратора']
      };
    }

    // Проверяем наличие данных о профилях
    const domainEnabled = data.domain?.enabled;
    const privateEnabled = data.private?.enabled;
    const publicEnabled = data.public?.enabled;

    const hasData = domainEnabled !== null && domainEnabled !== undefined ||
                    privateEnabled !== null && privateEnabled !== undefined ||
                    publicEnabled !== null && publicEnabled !== undefined;

    if (!hasData) {
      return {
        status: 'no_data',
        displayName: 'Брандмауэр Windows',
        description: 'Данные о профилях брандмауэра недоступны',
        source: 'Agent',
        lastUpdated: timestamp,
        details: {
          'Доменный профиль': 'Недоступно',
          'Частный профиль': 'Недоступно',
          'Публичный профиль': 'Недоступно'
        },
        recommendations: ['Проверьте права агента для доступа к настройкам брандмауэра']
      };
    }

    // Подсчитываем включённые профили
    const profiles = [domainEnabled, privateEnabled, publicEnabled];
    const enabledCount = profiles.filter(p => p === true).length;
    const totalCount = profiles.filter(p => p !== null && p !== undefined).length;

    let status: SecurityStatusType;
    let recommendations: string[] = [];

    if (enabledCount === totalCount && totalCount > 0) {
      status = 'enabled';
    } else if (enabledCount === 0) {
      status = 'disabled';
      recommendations.push('Включите брандмауэр для защиты от сетевых угроз');
    } else {
      status = 'disabled'; // Частично включён = считаем отключенным
      recommendations.push('Включите брандмауэр для всех сетевых профилей');
    }

    return {
      status,
      displayName: 'Брандмауэр Windows',
      description: 'Сетевая защита Windows',
      source: 'Agent',
      lastUpdated: timestamp,
      details: {
        'Доменный профиль': domainEnabled !== null && domainEnabled !== undefined ? (domainEnabled ? 'Включен' : 'Отключен') : 'Недоступно',
        'Частный профиль': privateEnabled !== null && privateEnabled !== undefined ? (privateEnabled ? 'Включен' : 'Отключен') : 'Недоступно',
        'Публичный профиль': publicEnabled !== null && publicEnabled !== undefined ? (publicEnabled ? 'Включен' : 'Отключен') : 'Недоступно'
      },
      recommendations
    };
  }

  private normalizeUACStatus(data: any, timestamp: string): SecurityStatus {
    if (!data) {
      return {
        status: 'no_data',
        displayName: 'Контроль учётных записей (UAC)',
        description: 'Данные о UAC недоступны',
        source: 'API',
        lastUpdated: timestamp,
        details: {},
        recommendations: ['Проверьте подключение к агенту']
      };
    }

    if (data.permission === 'denied' || data.permission === 'access_denied') {
      return {
        status: 'access_denied',
        displayName: 'Контроль учётных записей (UAC)',
        description: 'Недостаточно прав для проверки UAC',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Права доступа': data.permission },
        recommendations: ['Запустите агент с правами администратора']
      };
    }

    const enabled = data.enabled;

    if (enabled === null || enabled === undefined) {
      return {
        status: 'unknown',
        displayName: 'Контроль учётных записей (UAC)',
        description: 'Неопределённое состояние UAC',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Состояние': 'null' },
        recommendations: ['Обратитесь к администратору']
      };
    }

    return {
      status: enabled ? 'enabled' : 'disabled',
      displayName: 'Контроль учётных записей (UAC)',
      description: 'Контроль повышения привилегий',
      source: 'Agent',
      lastUpdated: timestamp,
      details: { 'Состояние': enabled ? 'Включен' : 'Отключен' },
      recommendations: enabled ? [] : ['Включите UAC для защиты от несанкционированного повышения привилегий']
    };
  }

  private normalizeRDPStatus(data: any, timestamp: string): SecurityStatus {
    if (!data) {
      return {
        status: 'no_data',
        displayName: 'Удалённый рабочий стол (RDP)',
        description: 'Данные о RDP недоступны',
        source: 'API',
        lastUpdated: timestamp,
        details: {},
        recommendations: ['Проверьте подключение к агенту']
      };
    }

    if (data.permission === 'denied' || data.permission === 'access_denied') {
      return {
        status: 'access_denied',
        displayName: 'Удалённый рабочий стол (RDP)',
        description: 'Недостаточно прав для проверки RDP',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Права доступа': data.permission },
        recommendations: ['Запустите агент с правами администратора']
      };
    }

    const enabled = data.enabled;

    if (enabled === null || enabled === undefined) {
      return {
        status: 'unknown',
        displayName: 'Удалённый рабочий стол (RDP)',
        description: 'Неопределённое состояние RDP',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Состояние': 'null' },
        recommendations: ['Обратитесь к администратору']
      };
    }

    // Для RDP: включён = потенциальный риск, отключён = безопасно
    return {
      status: enabled ? 'enabled' : 'disabled',
      displayName: 'Удалённый рабочий стол (RDP)',
      description: 'Служба удалённого доступа',
      source: 'Agent',
      lastUpdated: timestamp,
      details: { 'Состояние': enabled ? 'Включен' : 'Отключен' },
      recommendations: enabled ? [
        'RDP включён - убедитесь в необходимости удалённого доступа',
        'Используйте сильные пароли и ограничьте доступ по IP',
        'Рассмотрите возможность смены стандартного порта 3389'
      ] : []
    };
  }

  private normalizeBitLockerStatus(data: any, timestamp: string): SecurityStatus {
    if (!data) {
      return {
        status: 'no_data',
        displayName: 'BitLocker',
        description: 'Данные о BitLocker недоступны',
        source: 'API',
        lastUpdated: timestamp,
        details: {},
        recommendations: ['Проверьте подключение к агенту']
      };
    }

    if (data.permission === 'denied' || data.permission === 'access_denied') {
      return {
        status: 'access_denied',
        displayName: 'BitLocker',
        description: 'Недостаточно прав для проверки BitLocker',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Права доступа': data.permission },
        recommendations: ['Запустите агент с правами администратора']
      };
    }

    const enabled = data.enabled;

    if (enabled === null || enabled === undefined) {
      return {
        status: 'unknown',
        displayName: 'BitLocker',
        description: 'Неопределённое состояние BitLocker',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Состояние': 'null' },
        recommendations: ['Обратитесь к администратору']
      };
    }

    return {
      status: enabled ? 'enabled' : 'disabled',
      displayName: 'BitLocker',
      description: 'Шифрование дисков',
      source: 'Agent',
      lastUpdated: timestamp,
      details: { 'Состояние системного диска': enabled ? 'Зашифрован' : 'Не зашифрован' },
      recommendations: enabled ? [] : ['Включите BitLocker для защиты данных на диске']
    };
  }

  private normalizeSMB1Status(data: any, timestamp: string): SecurityStatus {
    if (!data) {
      return {
        status: 'no_data',
        displayName: 'Протокол SMB1',
        description: 'Данные о SMB1 недоступны',
        source: 'API',
        lastUpdated: timestamp,
        details: {},
        recommendations: ['Проверьте подключение к агенту']
      };
    }

    if (data.permission === 'denied' || data.permission === 'access_denied') {
      return {
        status: 'access_denied',
        displayName: 'Протокол SMB1',
        description: 'Недостаточно прав для проверки SMB1',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Права доступа': data.permission },
        recommendations: ['Запустите агент с правами администратора']
      };
    }

    const enabled = data.enabled;

    if (enabled === null || enabled === undefined) {
      return {
        status: 'unknown',
        displayName: 'Протокол SMB1',
        description: 'Неопределённое состояние SMB1',
        source: 'Agent',
        lastUpdated: timestamp,
        details: { 'Состояние': 'null' },
        recommendations: ['Обратитесь к администратору']
      };
    }

    // Для SMB1: включён = критично (уязвимость), отключён = безопасно
    return {
      status: enabled ? 'enabled' : 'disabled',
      displayName: 'Протокол SMB1',
      description: 'Устаревший сетевой протокол',
      source: 'Agent',
      lastUpdated: timestamp,
      details: { 'Состояние': enabled ? 'Включен' : 'Отключен' },
      recommendations: enabled ? [
        'Отключите SMB1 - это устаревший и небезопасный протокол',
        'SMB1 подвержен множественным уязвимостям безопасности'
      ] : []
    };
  }

  private getEmptySecurityData(): NormalizedSecurityData {
    const now = new Date().toISOString();
    const noDataStatus: SecurityStatus = {
      status: 'no_data',
      displayName: 'Неизвестный модуль',
      description: 'Данные недоступны',
      source: 'API',
      lastUpdated: now,
      details: {},
      recommendations: ['Проверьте подключение к системе']
    };

    return {
      defender: { ...noDataStatus, displayName: 'Windows Defender' },
      firewall: { ...noDataStatus, displayName: 'Брандмауэр Windows' },
      uac: { ...noDataStatus, displayName: 'Контроль учётных записей (UAC)' },
      rdp: { ...noDataStatus, displayName: 'Удалённый рабочий стол (RDP)' },
      bitlocker: { ...noDataStatus, displayName: 'BitLocker' },
      smb1: { ...noDataStatus, displayName: 'Протокол SMB1' },
      lastUpdated: now
    };
  }
}

export const securityDataNormalizer = new SecurityDataNormalizer();
