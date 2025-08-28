import { 
  SecurityItemData, 
  SecurityItemStatus, 
  SecurityItemSeverity,
  SECURITY_ITEM_NAMES,
  SECURITY_ITEM_ICONS,
  FALLBACK_RECOMMENDATIONS
} from '../types/securityAccordion';
import { NormalizedSecurityData, SecurityStatus, SecurityStatusType } from '../types/hostTypes';

export class SecurityAccordionNormalizer {
  
  /**
   * Нормализует данные безопасности в формат для accordion-интерфейса
   */
  normalizeSecurityData(data: NormalizedSecurityData): SecurityItemData[] {
    const items: SecurityItemData[] = [];
    
    // Windows Defender
    items.push(this.normalizeDefender(data.defender));
    
    // Firewall - объединяем все профили в один элемент
    items.push(this.normalizeFirewall(data.firewall));
    
    // UAC
    items.push(this.normalizeGenericItem('uac', data.uac));
    
    // RDP
    items.push(this.normalizeGenericItem('rdp', data.rdp));
    
    // BitLocker
    items.push(this.normalizeBitLocker(data.bitlocker));
    
    // SMB1
    items.push(this.normalizeGenericItem('smb1', data.smb1));
    
    // Windows Update
    items.push(this.normalizeWindowsUpdate(data.windowsUpdate));
    
    return items.filter(item => item !== null);
  }

  private normalizeDefender(status: SecurityStatus): SecurityItemData {
    return {
      id: 'defender',
      name: SECURITY_ITEM_NAMES.defender,
      status: this.mapStatus(status.status),
      severity: this.calculateSeverity('defender', status),
      details: this.enhanceDetails(status.details),
      source: status.source,
      last_seen: status.lastUpdated,
      icon: SECURITY_ITEM_ICONS.defender,
      description: status.description,
      recommendations: status.recommendations.length > 0 
        ? status.recommendations 
        : this.getFallbackRecommendations(status.status),
      raw_data: status
    };
  }

  private normalizeFirewall(status: SecurityStatus): SecurityItemData {
    // Анализируем состояние всех профилей
    const profileKeys = ['domain_profile', 'private_profile', 'public_profile'] as const;
    const profileNames: Record<typeof profileKeys[number], string> = {
      domain_profile: 'Домен',
      private_profile: 'Частная сеть',
      public_profile: 'Общедоступная сеть'
    };
    
    let enabledProfiles = 0;
    let totalProfiles = 0;
    const profileDetails: any = {};
    
    profileKeys.forEach(profileKey => {
      if (status.details[profileKey]) {
        totalProfiles++;
        const profileStatus = this.getProfileStatus(status.details[profileKey]);
        const originalProfile = status.details[profileKey];
        
        // Создаем упрощенную структуру данных профиля
        profileDetails[profileKey] = {
          name: profileNames[profileKey],
          status: profileStatus,
          enabled: originalProfile.enabled || false,
          state: originalProfile.status || originalProfile.state || 'unknown',
          // Добавляем только простые поля, избегая сложных объектов
          ...(typeof originalProfile.enabled === 'boolean' && { enabled: originalProfile.enabled }),
          ...(typeof originalProfile.status === 'string' && { firewall_status: originalProfile.status }),
          ...(typeof originalProfile.state === 'string' && { firewall_state: originalProfile.state })
        };
        
        if (profileStatus === 'ok') {
          enabledProfiles++;
        }
      }
    });

    // Определяем общий статус и серьезность
    let overallStatus: SecurityItemStatus;
    let overallSeverity: SecurityItemSeverity;
    
    if (totalProfiles === 0) {
      // Нет данных о профилях, используем общий статус
      overallStatus = this.mapStatus(status.status);
      overallSeverity = this.calculateSeverity('firewall', status);
    } else if (enabledProfiles === totalProfiles) {
      // Все профили включены - зеленый
      overallStatus = 'ok';
      overallSeverity = 'none';
    } else if (enabledProfiles === 0) {
      // Все профили выключены - красный
      overallStatus = 'disabled';
      overallSeverity = 'critical';
    } else {
      // Частично включены - желтый
      overallStatus = 'disabled';
      overallSeverity = 'high';
    }

    // Формируем описание
    let description = 'Брандмауэр Windows';
    if (totalProfiles > 0) {
      description += ` (${enabledProfiles}/${totalProfiles} профилей активно)`;
    }

    // Формируем рекомендации
    let recommendations: string[] = [];
    if (totalProfiles > 0) {
      if (enabledProfiles === 0) {
        recommendations = [
          'Включите брандмауэр для всех сетевых профилей',
          'Брандмауэр является критически важной защитой',
          'Проверьте настройки групповых политик'
        ];
      } else if (enabledProfiles < totalProfiles) {
        const disabledProfiles = Object.keys(profileDetails)
          .filter(key => profileDetails[key].status !== 'ok')
          .map(key => profileNames[key as keyof typeof profileNames])
          .join(', ');
        recommendations = [
          `Включите брандмауэр для профилей: ${disabledProfiles}`,
          'Все сетевые профили должны быть защищены'
        ];
      } else {
        recommendations = [
          'Брандмауэр настроен корректно',
          'Регулярно проверяйте правила брандмауэра'
        ];
      }
    } else {
      recommendations = status.recommendations.length > 0 
        ? status.recommendations 
        : this.getFallbackRecommendations(status.status);
    }

    return {
      id: 'firewall',
      name: 'Брандмауэр Windows',
      status: overallStatus,
      severity: overallSeverity,
      details: {
        ...status.details,
        profiles: profileDetails,
        enabled_profiles: enabledProfiles,
        total_profiles: totalProfiles,
        profile_status_summary: `${enabledProfiles}/${totalProfiles} активных профилей`
      },
      source: status.source,
      last_seen: status.lastUpdated,
      icon: SECURITY_ITEM_ICONS.firewall_domain,
      description,
      recommendations,
      raw_data: status
    };
  }

  private normalizeBitLocker(status: SecurityStatus): SecurityItemData {
    const details = { ...status.details };
    
    // Если есть информация о томах, структурируем её лучше
    const volumeKeys = Object.keys(details).filter(key => key.startsWith('volume_'));
    if (volumeKeys.length > 0) {
      const volumes: any[] = [];
      volumeKeys.forEach(key => {
        if (key.includes('_device')) {
          const volumeNum = key.match(/volume_(\d+)/)?.[1];
          if (volumeNum) {
            const volume = {
              device: details[`volume_${volumeNum}_device`],
              size: details[`volume_${volumeNum}_size`],
              status: details[`volume_${volumeNum}_status`],
              protection: details[`volume_${volumeNum}_protection`]
            };
            volumes.push(volume);
          }
        }
      });
      
      if (volumes.length > 0) {
        details.volumes = volumes;
        // Удаляем старые ключи для чистоты
        volumeKeys.forEach(key => delete details[key]);
      }
    }
    
    return {
      id: 'bitlocker',
      name: SECURITY_ITEM_NAMES.bitlocker,
      status: this.mapStatus(status.status),
      severity: this.calculateSeverity('bitlocker', status),
      details,
      source: status.source,
      last_seen: status.lastUpdated,
      icon: SECURITY_ITEM_ICONS.bitlocker,
      description: status.description,
      recommendations: status.recommendations.length > 0 
        ? status.recommendations 
        : this.getFallbackRecommendations(status.status),
      raw_data: status
    };
  }

  private normalizeWindowsUpdate(status: SecurityStatus): SecurityItemData {
    return {
      id: 'windows_update',
      name: SECURITY_ITEM_NAMES.windows_update,
      status: this.mapStatus(status.status),
      severity: this.calculateSeverity('windows_update', status),
      details: this.enhanceDetails(status.details),
      source: status.source,
      last_seen: status.lastUpdated,
      icon: SECURITY_ITEM_ICONS.windows_update,
      description: status.description,
      recommendations: status.recommendations.length > 0 
        ? status.recommendations 
        : this.getFallbackRecommendations(status.status),
      raw_data: status
    };
  }

  private normalizeGenericItem(id: string, status: SecurityStatus): SecurityItemData {
    return {
      id,
      name: SECURITY_ITEM_NAMES[id] || id,
      status: this.mapStatus(status.status),
      severity: this.calculateSeverity(id, status),
      details: this.enhanceDetails(status.details),
      source: status.source,
      last_seen: status.lastUpdated,
      icon: SECURITY_ITEM_ICONS[id] || 'shield',
      description: status.description,
      recommendations: status.recommendations.length > 0 
        ? status.recommendations 
        : this.getFallbackRecommendations(status.status),
      raw_data: status
    };
  }

  /**
   * Маппинг статусов из SecurityStatusType в SecurityItemStatus
   */
  private mapStatus(status: SecurityStatusType): SecurityItemStatus {
    const statusMap: Record<SecurityStatusType, SecurityItemStatus> = {
      'enabled': 'ok',
      'disabled': 'disabled', 
      'no_data': 'no_data',
      'access_denied': 'denied',
      'unknown': 'unknown'
    };
    
    return statusMap[status] || 'unknown';
  }

  /**
   * Вычисляет severity на основе типа модуля и его статуса
   */
  private calculateSeverity(moduleType: string, status: SecurityStatus): SecurityItemSeverity {
    const statusType = this.mapStatus(status.status);
    
    // Критичные модули
    const criticalModules = ['defender', 'firewall', 'windows_update'];
    const highPriorityModules = ['uac', 'bitlocker'];
    const mediumPriorityModules = ['rdp', 'smb1'];
    
    // Для отключенных критичных модулей - критичность
    if (statusType === 'disabled' && criticalModules.includes(moduleType)) {
      return 'critical';
    }
    
    // Для отключенных важных модулей - высокая
    if (statusType === 'disabled' && highPriorityModules.includes(moduleType)) {
      return 'high';
    }
    
    // Для отключенных средних модулей - средняя
    if (statusType === 'disabled' && mediumPriorityModules.includes(moduleType)) {
      return 'medium';
    }
    
    // RDP и SMB1 - инверсная логика (включено = плохо)
    if ((moduleType === 'rdp' || moduleType === 'smb1') && statusType === 'disabled') {
      return 'none'; // RDP отключен = хорошо
    }
    
    // Нет данных - низкая приоритетность
    if (statusType === 'no_data' || statusType === 'denied') {
      return 'low';
    }
    
    // По умолчанию
    return 'none';
  }

  /**
   * Улучшает детали для лучшего отображения
   */
  private enhanceDetails(details: Record<string, any>): Record<string, any> {
    const enhanced = { ...details };
    
    // Форматируем даты
    Object.keys(enhanced).forEach(key => {
      if (key.includes('date') || key.includes('time') || key.includes('updated')) {
        try {
          const date = new Date(enhanced[key]);
          if (!isNaN(date.getTime())) {
            enhanced[key] = date.toLocaleString('ru-RU');
          }
        } catch (e) {
          // Оставляем как есть если не удалось спарсить
        }
      }
    });
    
    return enhanced;
  }

  /**
   * Определяет статус профиля брандмауэра
   */
  private getProfileStatus(profileData: any): SecurityItemStatus {
    // Если это объект с полем enabled
    if (typeof profileData === 'object' && profileData !== null) {
      if (profileData.enabled === true || profileData.status === 'active') {
        return 'ok';
      } else if (profileData.enabled === false || profileData.status === 'inactive') {
        return 'disabled';
      }
    }
    
    // Если это строка (старый формат)
    if (typeof profileData === 'string') {
      const profileText = profileData.toLowerCase();
      if (profileText.includes('активен') || profileText.includes('включен')) {
        return 'ok';
      } else if (profileText.includes('отключен')) {
        return 'disabled';
      }
    }
    
    return 'unknown';
  }

  /**
   * Возвращает резервные рекомендации для статусов без данных
   */
  private getFallbackRecommendations(status: SecurityStatusType): string[] {
    return FALLBACK_RECOMMENDATIONS[this.mapStatus(status)] || [];
  }

  /**
   * Фильтрует элементы согласно заданным фильтрам
   */
  filterItems(items: SecurityItemData[], filters: any): SecurityItemData[] {
    let filtered = [...items];
    
    // Поиск по названию
    if (filters.search?.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Фильтр по статусу
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      if (filters.statusFilter === 'problems_only') {
        filtered = filtered.filter(item => 
          item.status === 'disabled' || 
          item.severity === 'critical' || 
          item.severity === 'high'
        );
      } else if (filters.statusFilter === 'no_data_only') {
        filtered = filtered.filter(item => 
          item.status === 'no_data' || 
          item.status === 'denied'
        );
      }
    }
    
    // Фильтр по severity
    if (filters.severityFilter && filters.severityFilter !== 'all') {
      filtered = filtered.filter(item => item.severity === filters.severityFilter);
    }
    
    // Сортировка
    filtered.sort((a, b) => {
      if (filters.sortBy === 'severity') {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
        const comparison = severityOrder[a.severity] - severityOrder[b.severity];
        return filters.sortOrder === 'desc' ? -comparison : comparison;
      } else if (filters.sortBy === 'last_seen') {
        const aTime = new Date(a.last_seen).getTime();
        const bTime = new Date(b.last_seen).getTime();
        return filters.sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      } else if (filters.sortBy === 'name') {
        const comparison = a.name.localeCompare(b.name, 'ru');
        return filters.sortOrder === 'desc' ? -comparison : comparison;
      }
      return 0;
    });
    
    return filtered;
  }

  /**
   * Сортирует элементы по умолчанию (severity -> last_seen -> name)
   */
  sortItemsDefault(items: SecurityItemData[]): SecurityItemData[] {
    return items.sort((a, b) => {
      // Сначала по severity (критичные сверху)
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      const severityComparison = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityComparison !== 0) return severityComparison;
      
      // Затем по времени (свежие сверху)
      const aTime = new Date(a.last_seen).getTime();
      const bTime = new Date(b.last_seen).getTime();
      const timeComparison = bTime - aTime;
      if (timeComparison !== 0) return timeComparison;
      
      // Наконец по имени
      return a.name.localeCompare(b.name, 'ru');
    });
  }
}

// Создаем и экспортируем экземпляр
export const securityAccordionNormalizer = new SecurityAccordionNormalizer();
export default securityAccordionNormalizer;
