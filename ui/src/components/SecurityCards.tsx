import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  Lock,
  Wifi,
  HardDrive,
  UserCheck,
  Monitor,
  Activity
} from 'lucide-react';
import { hostApiClient } from '../api/hostApi';
import { SecurityData } from '../types/hostTypes';

interface SecurityCardsProps {
  hostId: string;
  className?: string;
}

interface SecurityCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  status: 'ok' | 'warning' | 'critical' | 'unknown';
  description: string;
  details: Array<{ label: string; value: string; status?: 'ok' | 'warning' | 'critical' }>;
  recommendations: string[];
}

export const SecurityCards: React.FC<SecurityCardsProps> = ({ 
  hostId, 
  className = '' 
}) => {
  const [securityData, setSecurityData] = useState<SecurityData>({ modules: null });
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const data = await hostApiClient.getHostSecurity(hostId);
      setSecurityData(data);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hostId) {
      loadSecurityData();
    }
  }, [hostId]);

  const getSecurityCards = (): SecurityCard[] => {
    const cards: SecurityCard[] = [];

    // Windows Defender
    const defenderCard: SecurityCard = {
      id: 'defender',
      title: 'Windows Defender',
      icon: <Shield className="h-6 w-6" />,
      status: 'unknown',
      description: 'Антивирусная защита Windows',
      details: [],
      recommendations: []
    };

    if (securityData.defender) {
      const def = securityData.defender;
      defenderCard.status = def.enabled ? 'ok' : 'critical';
      defenderCard.details = [
        { label: 'Состояние', value: def.enabled ? 'Включен' : 'Отключен', status: def.enabled ? 'ok' : 'critical' },
        { label: 'Статус', value: def.status || 'Неизвестно' },
        { label: 'Возраст сигнатур', value: def.signatures_age_days !== undefined ? `${def.signatures_age_days} дней` : 'Неизвестно', 
          status: def.signatures_age_days !== undefined ? (def.signatures_age_days > 7 ? 'warning' : 'ok') : undefined },
        { label: 'Защита в реальном времени', value: def.real_time_protection ? 'Включена' : 'Отключена', 
          status: def.real_time_protection ? 'ok' : 'warning' }
      ];
      
      if (!def.enabled) {
        defenderCard.recommendations.push('Включите Windows Defender для базовой защиты');
      }
      if (def.signatures_age_days && def.signatures_age_days > 7) {
        defenderCard.recommendations.push('Обновите антивирусные сигнатуры');
      }
      if (!def.real_time_protection) {
        defenderCard.recommendations.push('Включите защиту в реальном времени');
      }
    } else {
      defenderCard.description = 'Данные о Windows Defender недоступны';
      defenderCard.recommendations.push('Проверьте права агента для сбора данных о Defender');
    }

    cards.push(defenderCard);

    // Брандмауэр Windows
    const firewallCard: SecurityCard = {
      id: 'firewall',
      title: 'Брандмауэр Windows',
      icon: <Wifi className="h-6 w-6" />,
      status: 'unknown',
      description: 'Сетевая защита Windows',
      details: [],
      recommendations: []
    };

    if (securityData.firewall) {
      const fw = securityData.firewall;
      const profiles = [fw.domain_profile, fw.private_profile, fw.public_profile];
      const enabledProfiles = profiles.filter(p => p === true).length;
      
      firewallCard.status = enabledProfiles === 3 ? 'ok' : (enabledProfiles > 0 ? 'warning' : 'critical');
      firewallCard.details = [
        { label: 'Доменный профиль', value: fw.domain_profile ? 'Включен' : 'Отключен', status: fw.domain_profile ? 'ok' : 'warning' },
        { label: 'Частный профиль', value: fw.private_profile ? 'Включен' : 'Отключен', status: fw.private_profile ? 'ok' : 'warning' },
        { label: 'Публичный профиль', value: fw.public_profile ? 'Включен' : 'Отключен', status: fw.public_profile ? 'ok' : 'warning' }
      ];
      
      if (!fw.domain_profile) {
        firewallCard.recommendations.push('Включите брандмауэр для доменного профиля');
      }
      if (!fw.private_profile) {
        firewallCard.recommendations.push('Включите брандмауэр для частного профиля');
      }
      if (!fw.public_profile) {
        firewallCard.recommendations.push('Включите брандмауэр для публичного профиля');
      }
    } else {
      firewallCard.description = 'Данные о брандмауэре недоступны';
      firewallCard.recommendations.push('Проверьте права агента для сбора данных о брандмауэре');
    }

    cards.push(firewallCard);

    // UAC (User Account Control)
    const uacCard: SecurityCard = {
      id: 'uac',
      title: 'Контроль учетных записей (UAC)',
      icon: <UserCheck className="h-6 w-6" />,
      status: 'unknown',
      description: 'Контроль повышения привилегий',
      details: [],
      recommendations: []
    };

    if (securityData.uac) {
      const uac = securityData.uac;
      uacCard.status = uac.enabled ? 'ok' : 'critical';
      uacCard.details = [
        { label: 'Состояние', value: uac.enabled ? 'Включен' : 'Отключен', status: uac.enabled ? 'ok' : 'critical' },
        { label: 'Уровень', value: uac.level || 'Неизвестно' }
      ];
      
      if (!uac.enabled) {
        uacCard.recommendations.push('Включите UAC для защиты от несанкционированного повышения привилегий');
      }
    } else {
      uacCard.description = 'Данные о UAC недоступны';
      uacCard.recommendations.push('Проверьте права агента для сбора данных о UAC');
    }

    cards.push(uacCard);

    // RDP (Remote Desktop Protocol)
    const rdpCard: SecurityCard = {
      id: 'rdp',
      title: 'Удаленный рабочий стол (RDP)',
      icon: <Monitor className="h-6 w-6" />,
      status: 'unknown',
      description: 'Служба удаленного доступа',
      details: [],
      recommendations: []
    };

    if (securityData.rdp) {
      const rdp = securityData.rdp;
      rdpCard.status = rdp.enabled ? 'warning' : 'ok';
      rdpCard.details = [
        { label: 'Состояние', value: rdp.enabled ? 'Включен' : 'Отключен', status: rdp.enabled ? 'warning' : 'ok' },
        { label: 'Порт', value: rdp.port?.toString() || 'Неизвестно' }
      ];
      
      if (rdp.enabled) {
        rdpCard.recommendations.push('RDP включен - убедитесь в необходимости удаленного доступа');
        rdpCard.recommendations.push('Используйте сильные пароли и ограничьте доступ по IP');
        if (rdp.port === 3389) {
          rdpCard.recommendations.push('Рассмотрите возможность смены стандартного порта 3389');
        }
      }
    } else {
      rdpCard.description = 'Данные о RDP недоступны';
      rdpCard.recommendations.push('Проверьте права агента для сбора данных о RDP');
    }

    cards.push(rdpCard);

    // BitLocker
    const bitlockerCard: SecurityCard = {
      id: 'bitlocker',
      title: 'BitLocker',
      icon: <HardDrive className="h-6 w-6" />,
      status: 'unknown',
      description: 'Шифрование дисков',
      details: [],
      recommendations: []
    };

    if (securityData.bitlocker) {
      const bl = securityData.bitlocker;
      bitlockerCard.status = bl.status === 'enabled' ? 'ok' : 'warning';
      bitlockerCard.details = [
        { label: 'Состояние', value: bl.status || 'Неизвестно', status: bl.status === 'enabled' ? 'ok' : 'warning' },
        { label: 'Метод шифрования', value: bl.encryption_method || 'Неизвестно' }
      ];
      
      if (bl.status !== 'enabled') {
        bitlockerCard.recommendations.push('Включите BitLocker для защиты данных на диске');
      }
    } else {
      bitlockerCard.description = 'Данные о BitLocker недоступны';
      bitlockerCard.recommendations.push('Проверьте права агента для сбора данных о BitLocker');
    }

    cards.push(bitlockerCard);

    // SMB1
    const smb1Card: SecurityCard = {
      id: 'smb1',
      title: 'Протокол SMB1',
      icon: <Settings className="h-6 w-6" />,
      status: 'unknown',
      description: 'Устаревший сетевой протокол',
      details: [],
      recommendations: []
    };

    if (securityData.smb1) {
      const smb = securityData.smb1;
      smb1Card.status = smb.enabled ? 'critical' : 'ok';
      smb1Card.details = [
        { label: 'Состояние', value: smb.enabled ? 'Включен' : 'Отключен', status: smb.enabled ? 'critical' : 'ok' }
      ];
      
      if (smb.enabled) {
        smb1Card.recommendations.push('Отключите SMB1 - это устаревший и небезопасный протокол');
        smb1Card.recommendations.push('SMB1 подвержен множественным уязвимостям безопасности');
      }
    } else {
      smb1Card.description = 'Данные о SMB1 недоступны';
      smb1Card.recommendations.push('Проверьте права агента для сбора данных о SMB1');
    }

    cards.push(smb1Card);

    return cards;
  };

  const getStatusColor = (status: SecurityCard['status']) => {
    switch (status) {
      case 'ok':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'critical':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-700/20 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: SecurityCard['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const securityCards = getSecurityCards();

  return (
    <div className={`${className}`}>
      {/* Заголовок */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Параметры безопасности системы
        </h3>
        <button
          onClick={loadSecurityData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Обновить данные безопасности"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <div className="text-gray-500 dark:text-gray-400">Загрузка параметров безопасности...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityCards.map((card) => (
            <div
              key={card.id}
              className={`border rounded-lg transition-all duration-200 ${getStatusColor(card.status)} ${
                expandedCard === card.id ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
              }`}
            >
              {/* Заголовок карточки */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`${
                      card.status === 'ok' ? 'text-green-600 dark:text-green-400' :
                      card.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                      card.status === 'critical' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {card.icon}
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{card.title}</h4>
                  </div>
                  {getStatusIcon(card.status)}
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.description}</p>
                
                {/* Краткая сводка */}
                {card.details.length > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium text-gray-700 dark:text-gray-300">
                      Состояние: {card.details[0]?.value || 'Неизвестно'}
                    </div>
                  </div>
                )}
              </div>

              {/* Развернутые детали */}
              {expandedCard === card.id && (
                <div className="border-t border-gray-200 dark:border-gray-600 p-4 bg-white dark:bg-gray-800">
                  {/* Детальная информация */}
                  {card.details.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Детали:</h5>
                      <div className="space-y-1 text-sm">
                        {card.details.map((detail, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">{detail.label}:</span>
                            <span className={`font-medium ${
                              detail.status === 'ok' ? 'text-green-600 dark:text-green-400' :
                              detail.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                              detail.status === 'critical' ? 'text-red-600 dark:text-red-400' :
                              'text-gray-900 dark:text-white'
                            }`}>
                              {detail.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Рекомендации */}
                  {card.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Рекомендации:
                      </h5>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {card.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Общие рекомендации */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Общие рекомендации по безопасности
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <div>• Регулярно обновляйте операционную систему и установленное программное обеспечение</div>
          <div>• Используйте сильные пароли и многофакторную аутентификацию</div>
          <div>• Ограничьте права пользователей до минимально необходимых</div>
          <div>• Регулярно создавайте резервные копии важных данных</div>
          <div>• Мониторьте журналы событий на предмет подозрительной активности</div>
        </div>
      </div>
    </div>
  );
};
