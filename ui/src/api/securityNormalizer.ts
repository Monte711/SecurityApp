import { SecurityData, NormalizedSecurityData, SecurityStatus, SecurityStatusType } from '../types/hostTypes';

export class SecurityDataNormalizer {
  async getNormalizedHostSecurity(hostId: string): Promise<NormalizedSecurityData> {
    // Получаем полные данные события через API
    const response = await fetch(`/api/host/${hostId}/posture/latest`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const fullData = await response.json();
    return this.normalizeSecurityData(fullData);
  }

  normalizeSecurityData(data: any): NormalizedSecurityData {
    return {
      defender: this.getDefenderStatus(data.security || {}),
      firewall: this.getFirewallStatus(data.security || {}),
      uac: this.getUacStatus(data.security || {}),
      rdp: this.getRdpStatus(data.security || {}),
      bitlocker: this.getBitlockerStatus(data.security || {}),
      smb1: this.getSmb1Status(data.security || {}),
      windowsUpdate: this.getWindowsUpdateStatus(data),
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
      // RDP включен - это плохо для безопасности (красный)
      status = 'disabled';
      details.rdp = 'RDP включен';
      recommendations.push('Рекомендуется отключить RDP если он не используется');
      recommendations.push('Если RDP необходим, используйте сильные пароли и ограничьте доступ по IP');
      recommendations.push('Рассмотрите использование VPN для удаленного доступа');
    } else if (rdpInfo.enabled === false) {
      // RDP отключен - это хорошо для безопасности (зелёный)
      status = 'enabled';
      details.rdp = 'RDP отключен';
      recommendations.push('Отлично! RDP отключен, что повышает безопасность системы');
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

    // Check if we have the new volume-based structure
    if (bitlockerInfo.volumes && Array.isArray(bitlockerInfo.volumes)) {
      let encryptedVolumes = 0;
      let totalVolumes = bitlockerInfo.volumes.length;
      
      bitlockerInfo.volumes.forEach((volume: any, index: number) => {
        const volumeKey = `volume_${index + 1}`;
        if (volume.device_id) {
          details[`${volumeKey}_device`] = `Диск: ${volume.device_id}`;
        }
        if (volume.size) {
          details[`${volumeKey}_size`] = `Размер: ${volume.size}`;
        }
        if (volume.conversion_status) {
          details[`${volumeKey}_status`] = `Статус: ${volume.conversion_status}`;
          if (volume.conversion_status.includes('FullyEncrypted') || 
              volume.conversion_status.includes('Encrypted')) {
            encryptedVolumes++;
          }
        }
        if (volume.protection_status) {
          details[`${volumeKey}_protection`] = `Защита: ${volume.protection_status}`;
        }
      });

      if (totalVolumes === 0) {
        status = 'no_data';
        details.bitlocker = 'Нет доступных дисков для шифрования';
      } else if (encryptedVolumes === totalVolumes) {
        status = 'enabled';
        details.bitlocker = `Зашифровано ${encryptedVolumes} из ${totalVolumes} дисков`;
      } else if (encryptedVolumes > 0) {
        status = 'disabled';
        details.bitlocker = `Зашифровано только ${encryptedVolumes} из ${totalVolumes} дисков`;
        recommendations.push('Включите шифрование BitLocker для всех дисков');
      } else {
        status = 'disabled';
        details.bitlocker = 'Ни один диск не зашифрован';
        recommendations.push('Включите шифрование BitLocker для защиты данных');
      }
    } else {
      // Fallback to old structure
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
      // SMB1 отключен - это хорошо для безопасности (зелёный)
      status = 'enabled';
      details.smb1 = 'SMB v1 отключен';
      recommendations.push('Отлично! SMB v1 отключен, что повышает безопасность системы');
    } else if (smb1Info.enabled === true) {
      // SMB1 включен - это плохо для безопасности (красный)
      status = 'disabled';
      details.smb1 = 'SMB v1 включен';
      recommendations.push('Критично! Отключите SMB v1 - это устаревший и небезопасный протокол');
      recommendations.push('SMB v1 имеет множество уязвимостей и должен быть отключен');
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

  private getWindowsUpdateStatus(data: any): SecurityStatus {
    // Получаем данные из секции windows_update
    const updateInfo = data.windows_update || {};
    
    let status: SecurityStatusType = 'unknown';
    let details: Record<string, any> = {};
    let recommendations: string[] = [];

    // Анализ статуса службы обновлений
    if (updateInfo.update_service_status === 'Running') {
      status = 'enabled';
      details.service = 'Служба обновлений запущена';
    } else if (updateInfo.update_service_status === 'Stopped') {
      status = 'disabled';
      details.service = 'Служба обновлений остановлена';
      recommendations.push('Запустите службу Windows Update');
    } else if (updateInfo.update_service_status === 'Disabled') {
      status = 'disabled';
      details.service = 'Служба обновлений отключена';
      recommendations.push('Включите службу Windows Update для получения обновлений безопасности');
    } else {
      status = 'no_data';
      details.service = 'Статус службы неизвестен';
    }

    // Обработка даты последнего обновления
    if (updateInfo.last_update_date) {
      try {
        const lastUpdate = new Date(updateInfo.last_update_date);
        const now = new Date();
        const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        
        details.lastUpdate = `Последнее обновление: ${lastUpdate.toLocaleDateString('ru-RU')}`;
        details.daysSinceUpdate = `${daysSinceUpdate} дней назад`;
        
        if (daysSinceUpdate > 30) {
          if (status === 'enabled') status = 'disabled';
          recommendations.push('Критично! Система не обновлялась более 30 дней');
        } else if (daysSinceUpdate > 7) {
          recommendations.push('Проверьте наличие обновлений безопасности');
        }
      } catch (e) {
        details.lastUpdate = 'Некорректная дата последнего обновления';
      }
    } else {
      details.lastUpdate = 'Дата последнего обновления недоступна';
      recommendations.push('Проверьте историю обновлений системы');
    }

    // Обработка ожидающих обновлений
    if (updateInfo.pending_updates !== null && updateInfo.pending_updates !== undefined) {
      if (updateInfo.pending_updates > 0) {
        details.pendingUpdates = `Ожидают установки: ${updateInfo.pending_updates} обновлений`;
        recommendations.push(`Установите ${updateInfo.pending_updates} ожидающих обновлений`);
        if (status === 'enabled') status = 'disabled';
      } else {
        details.pendingUpdates = 'Нет ожидающих обновлений';
      }
    } else {
      details.pendingUpdates = 'Данные об ожидающих обновлениях недоступны';
    }

    // Обработка уровня доступа
    if (updateInfo.permission) {
      details.permission = `Уровень доступа: ${updateInfo.permission}`;
      if (updateInfo.permission === 'denied') {
        if (status !== 'disabled') status = 'access_denied';
        recommendations.push('Запустите агент с правами администратора для получения полной информации');
      }
    }

    // Обработка ошибок
    if (updateInfo.error_message) {
      details.error = `Ошибка: ${updateInfo.error_message}`;
      if (status === 'enabled') status = 'disabled';
    }

    return {
      status,
      displayName: 'Обновления Windows',
      description: this.getStatusDescription(status, 'windowsUpdate'),
      source: 'Agent',
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
        rdp: 'Удаленный доступ отключен - система защищена',
        bitlocker: 'Диск зашифрован и защищен',
        smb1: 'Устаревший протокол отключен - система защищена',
        windowsUpdate: 'Система обновлений работает корректно'
      },
      disabled: {
        defender: 'Антивирус отключен - система уязвима',
        firewall: 'Брандмауэр отключен - система уязвима',
        uac: 'Контроль учетных записей отключен',
        rdp: 'Удаленный доступ включен - потенциальная угроза безопасности',
        bitlocker: 'Диск не зашифрован',
        smb1: 'Устаревший протокол включен - критическая угроза безопасности',
        windowsUpdate: 'Проблемы с обновлениями - система уязвима'
      },
      no_data: {
        defender: 'Данные о состоянии антивируса недоступны',
        firewall: 'Данные о состоянии брандмауэра недоступны',
        uac: 'Данные о состоянии UAC недоступны',
        rdp: 'Данные о состоянии RDP недоступны',
        bitlocker: 'Данные о состоянии BitLocker недоступны',
        smb1: 'Данные о состоянии SMB v1 недоступны',
        windowsUpdate: 'Данные об обновлениях Windows недоступны'
      },
      access_denied: {
        defender: 'Нет прав для получения данных об антивирусе',
        firewall: 'Нет прав для получения данных о брандмауэре',
        uac: 'Нет прав для получения данных о UAC',
        rdp: 'Нет прав для получения данных о RDP',
        bitlocker: 'Нет прав для получения данных о BitLocker',
        smb1: 'Нет прав для получения данных о SMB v1',
        windowsUpdate: 'Нет прав для получения данных об обновлениях'
      },
      unknown: {
        defender: 'Неизвестное состояние антивируса',
        firewall: 'Неизвестное состояние брандмауэра',
        uac: 'Неизвестное состояние UAC',
        rdp: 'Неизвестное состояние RDP',
        bitlocker: 'Неизвестное состояние BitLocker',
        smb1: 'Неизвестное состояние SMB v1',
        windowsUpdate: 'Неизвестное состояние обновлений Windows'
      }
    };

    return descriptions[status]?.[module] || 'Неизвестное состояние';
  }
}

// Create and export singleton instance
export const securityDataNormalizer = new SecurityDataNormalizer();
export default securityDataNormalizer;
