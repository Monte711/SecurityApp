import { SecurityData, NormalizedSecurityData, SecurityStatus, SecurityStatusType } from '../types/hostTypes';

export class SecurityDataNormalizer {
  async getNormalizedHostSecurity(hostId: string): Promise<NormalizedSecurityData> {
    // Получаем данные через dataAdapters
    const { getHostSecurity } = await import('./dataAdapters');
    const rawData = await getHostSecurity(hostId);
    return this.normalizeSecurityData(rawData);
  }

  normalizeSecurityData(data: SecurityData): NormalizedSecurityData {
    return {
      defender: this.getDefenderStatus(data),
      firewall: this.getFirewallStatus(data),
      uac: this.getUacStatus(data),
      rdp: this.getRdpStatus(data),
      bitlocker: this.getBitlockerStatus(data),
      smb1: this.getSmb1Status(data),
      lastUpdated: new Date().toISOString()
    };
  }

  private getDefenderStatus(data: SecurityData): SecurityStatus {
    const defenderInfo = data.defender || {};
    
    let status: SecurityStatusType = 'unknown';
    let details: Record<string, any> = {};
    let recommendations: string[] = [];

    // Анализ статуса Windows Defender
    if (defenderInfo.antivirus_enabled === true) {
      status = 'enabled';
      details.antivirus = 'Антивирус включен';
    } else if (defenderInfo.antivirus_enabled === false) {
      status = 'disabled';
      details.antivirus = 'Антивирус отключен';
      recommendations.push('Включите Windows Defender Antivirus');
    } else {
      status = 'no_data';
      details.antivirus = 'Данные недоступны';
    }

    if (defenderInfo.realtime_enabled === true) {
      details.realtime = 'Защита в реальном времени активна';
    } else if (defenderInfo.realtime_enabled === false) {
      if (status === 'enabled') status = 'disabled';
      details.realtime = 'Защита в реальном времени отключена';
      recommendations.push('Включите защиту в реальном времени');
    }

    if (defenderInfo.engine_version) {
      details.version = `Версия движка: ${defenderInfo.engine_version}`;
    }

    if (defenderInfo.signature_age_days !== undefined) {
      details.signatures = `Возраст сигнатур: ${defenderInfo.signature_age_days} дней`;
      if (defenderInfo.signature_age_days > 7) {
        recommendations.push('Обновите сигнатуры антивируса');
      }
    }

    return {
      status,
      displayName: 'Windows Defender',
      description: this.getStatusDescription(status, 'defender'),
      source: 'API',
      lastUpdated: new Date().toISOString(),
      details,
      recommendations
    };
  }

  private getFirewallStatus(data: SecurityData): SecurityStatus {
    const firewallInfo = data.firewall || {};
    
    let status: SecurityStatusType = 'unknown';
    let details: Record<string, any> = {};
    let recommendations: string[] = [];

    // Анализ брандмауэра по профилям
    const profiles = ['domain', 'private', 'public'] as const;
    let enabledProfiles = 0;
    let totalProfiles = 0;

    profiles.forEach(profile => {
      const profileInfo = firewallInfo[profile];
      if (profileInfo !== undefined) {
        totalProfiles++;
        if (profileInfo.enabled === true) {
          enabledProfiles++;
          details[`${profile}_profile`] = `${profile.charAt(0).toUpperCase() + profile.slice(1)} профиль активен`;
        } else if (profileInfo.enabled === false) {
          details[`${profile}_profile`] = `${profile.charAt(0).toUpperCase() + profile.slice(1)} профиль отключен`;
          recommendations.push(`Включите брандмауэр для ${profile} профиля`);
        }
      }
    });

    if (totalProfiles === 0) {
      status = 'no_data';
    } else if (enabledProfiles === totalProfiles) {
      status = 'enabled';
    } else if (enabledProfiles === 0) {
      status = 'disabled';
    } else {
      status = 'disabled'; // Частично включен считаем как отключен
    }

    return {
      status,
      displayName: 'Брандмауэр Windows',
      description: this.getStatusDescription(status, 'firewall'),
      source: 'API',
      lastUpdated: new Date().toISOString(),
      details,
      recommendations
    };
  }

  private getUacStatus(data: SecurityData): SecurityStatus {
    const uacInfo = data.uac || {};
    
    let status: SecurityStatusType = 'unknown';
    let details: Record<string, any> = {};
    let recommendations: string[] = [];

    if (uacInfo.enabled === true) {
      status = 'enabled';
      details.uac = 'UAC включен';
    } else if (uacInfo.enabled === false) {
      status = 'disabled';
      details.uac = 'UAC отключен';
      recommendations.push('Включите UAC для защиты от несанкционированных изменений');
    } else {
      status = 'no_data';
      details.uac = 'Данные недоступны';
    }

    if (uacInfo.permission) {
      details.permission = `Права доступа: ${uacInfo.permission}`;
    }

    return {
      status,
      displayName: 'Контроль учетных записей (UAC)',
      description: this.getStatusDescription(status, 'uac'),
      source: 'API',
      lastUpdated: new Date().toISOString(),
      details,
      recommendations
    };
  }

  private getRdpStatus(data: SecurityData): SecurityStatus {
    const rdpInfo = data.rdp || {};
    
    let status: SecurityStatusType = 'unknown';
    let details: Record<string, any> = {};
    let recommendations: string[] = [];

    if (rdpInfo.enabled === true) {
      status = 'enabled';
      details.rdp = 'RDP включен';
      recommendations.push('Убедитесь, что RDP используется только при необходимости');
      recommendations.push('Используйте сильные пароли и ограничьте доступ по IP');
    } else if (rdpInfo.enabled === false) {
      status = 'disabled';
      details.rdp = 'RDP отключен';
    } else {
      status = 'no_data';
      details.rdp = 'Данные недоступны';
    }

    if (rdpInfo.permission) {
      details.permission = `Права доступа: ${rdpInfo.permission}`;
    }

    return {
      status,
      displayName: 'Удаленный рабочий стол (RDP)',
      description: this.getStatusDescription(status, 'rdp'),
      source: 'API',
      lastUpdated: new Date().toISOString(),
      details,
      recommendations
    };
  }

  private getBitlockerStatus(data: SecurityData): SecurityStatus {
    const bitlockerInfo = data.bitlocker || {};
    
    let status: SecurityStatusType = 'unknown';
    let details: Record<string, any> = {};
    let recommendations: string[] = [];

    if (bitlockerInfo.enabled === true) {
      status = 'enabled';
      details.bitlocker = 'BitLocker включен';
    } else if (bitlockerInfo.enabled === false) {
      status = 'disabled';
      details.bitlocker = 'BitLocker отключен';
      recommendations.push('Включите шифрование BitLocker для защиты данных');
    } else {
      status = 'no_data';
      details.bitlocker = 'Данные недоступны';
    }

    if (bitlockerInfo.permission) {
      details.permission = `Права доступа: ${bitlockerInfo.permission}`;
    }

    return {
      status,
      displayName: 'Шифрование диска BitLocker',
      description: this.getStatusDescription(status, 'bitlocker'),
      source: 'API',
      lastUpdated: new Date().toISOString(),
      details,
      recommendations
    };
  }

  private getSmb1Status(data: SecurityData): SecurityStatus {
    const smb1Info = data.smb1 || {};
    
    let status: SecurityStatusType = 'unknown';
    let details: Record<string, any> = {};
    let recommendations: string[] = [];

    if (smb1Info.enabled === false) {
      status = 'disabled';
      details.smb1 = 'SMB v1 отключен';
    } else if (smb1Info.enabled === true) {
      status = 'enabled';
      details.smb1 = 'SMB v1 включен';
      recommendations.push('Отключите SMB v1 - это устаревший и небезопасный протокол');
    } else {
      status = 'no_data';
      details.smb1 = 'Данные недоступны';
    }

    if (smb1Info.permission) {
      details.permission = `Права доступа: ${smb1Info.permission}`;
    }

    return {
      status,
      displayName: 'Протокол SMB v1',
      description: this.getStatusDescription(status, 'smb1'),
      source: 'API',
      lastUpdated: new Date().toISOString(),
      details,
      recommendations
    };
  }

  private getStatusDescription(status: SecurityStatusType, module: string): string {
    const descriptions: Record<SecurityStatusType, Record<string, string>> = {
      enabled: {
        defender: 'Антивирус активен и обеспечивает защиту системы',
        firewall: 'Брандмауэр активен и блокирует несанкционированные подключения',
        uac: 'Контроль учетных записей активен',
        rdp: 'Удаленный доступ включен - требует внимания',
        bitlocker: 'Диск зашифрован и защищен',
        smb1: 'Устаревший протокол включен - требует отключения'
      },
      disabled: {
        defender: 'Антивирус отключен - система уязвима',
        firewall: 'Брандмауэр отключен - система уязвима',
        uac: 'Контроль учетных записей отключен',
        rdp: 'Удаленный доступ отключен',
        bitlocker: 'Диск не зашифрован',
        smb1: 'Устаревший протокол отключен'
      },
      no_data: {
        defender: 'Данные о состоянии антивируса недоступны',
        firewall: 'Данные о состоянии брандмауэра недоступны',
        uac: 'Данные о состоянии UAC недоступны',
        rdp: 'Данные о состоянии RDP недоступны',
        bitlocker: 'Данные о состоянии BitLocker недоступны',
        smb1: 'Данные о состоянии SMB v1 недоступны'
      },
      access_denied: {
        defender: 'Нет прав для получения данных об антивирусе',
        firewall: 'Нет прав для получения данных о брандмауэре',
        uac: 'Нет прав для получения данных о UAC',
        rdp: 'Нет прав для получения данных о RDP',
        bitlocker: 'Нет прав для получения данных о BitLocker',
        smb1: 'Нет прав для получения данных о SMB v1'
      },
      unknown: {
        defender: 'Неизвестное состояние антивируса',
        firewall: 'Неизвестное состояние брандмауэра',
        uac: 'Неизвестное состояние UAC',
        rdp: 'Неизвестное состояние RDP',
        bitlocker: 'Неизвестное состояние BitLocker',
        smb1: 'Неизвестное состояние SMB v1'
      }
    };

    return descriptions[status]?.[module] || 'Неизвестное состояние';
  }
}

// Create and export singleton instance
export const securityDataNormalizer = new SecurityDataNormalizer();
export default securityDataNormalizer;
