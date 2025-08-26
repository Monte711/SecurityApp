import { useState, useEffect } from "react";
import { NormalizedSecurityData } from "../types/hostTypes";
import { securityDataNormalizer } from "../api/securityNormalizer";
import { SecurityStatusCard } from "./SecurityStatusCard";

interface SecurityCardsProps {
  hostId: string;
  className?: string;
}

export function SecurityCards({ hostId, className = '' }: SecurityCardsProps) {
  const [securityData, setSecurityData] = useState<NormalizedSecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, [hostId]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const data = await securityDataNormalizer.getNormalizedHostSecurity(hostId);
      setSecurityData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`security-card rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium security-card-header mb-4">Безопасность</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
          <p className="mt-3 text-sm security-card-text">Загрузка данных безопасности...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`security-card rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium security-card-header mb-4">Безопасность</h3>
        <div className="text-center py-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-red-100 dark:bg-red-900/20 rounded-full">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadSecurityData}
            className="security-button inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className={`security-card rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium security-card-header mb-4">Безопасность</h3>
        <div className="text-center py-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full">
            <svg className="w-6 h-6 security-card-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm security-card-muted">Нет доступных данных о безопасности</p>
          <p className="text-xs security-card-muted mt-1">Данные могут быть недоступны из-за ограничений доступа</p>
        </div>
      </div>
    );
  }

  const handleRefresh = (module?: string) => {
    if (module) {
      console.log(`Refreshing ${module} security data...`);
    }
    loadSecurityData();
  };

  return (
    <div className={`security-card rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium security-card-header">Параметры безопасности системы</h3>
        <button
          onClick={() => handleRefresh()}
          className="security-button inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Обновить все
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SecurityStatusCard
          moduleId="defender"
          status={securityData.defender}
          onRefresh={() => handleRefresh('defender')}
        />
        
        <SecurityStatusCard
          moduleId="firewall"
          status={securityData.firewall}
          onRefresh={() => handleRefresh('firewall')}
        />
        
        <SecurityStatusCard
          moduleId="uac"
          status={securityData.uac}
          onRefresh={() => handleRefresh('uac')}
        />
        
        <SecurityStatusCard
          moduleId="rdp"
          status={securityData.rdp}
          onRefresh={() => handleRefresh('rdp')}
        />
        
        <SecurityStatusCard
          moduleId="bitlocker"
          status={securityData.bitlocker}
          onRefresh={() => handleRefresh('bitlocker')}
        />
        
        <SecurityStatusCard
          moduleId="smb1"
          status={securityData.smb1}
          onRefresh={() => handleRefresh('smb1')}
        />
      </div>
      
      <div className="mt-6 text-xs security-card-muted border-t border-gray-200 dark:border-gray-700 pt-4">
        Последнее обновление: {new Date(securityData.lastUpdated).toLocaleString('ru-RU')}
      </div>

      {/* Общие рекомендации */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Общие рекомендации по безопасности
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Регулярно обновляйте операционную систему и установленное программное обеспечение</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Используйте сильные пароли и многофакторную аутентификацию</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Ограничьте права пользователей до минимально необходимых</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Регулярно создавайте резервные копии важных данных</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>Мониторьте журналы событий на предмет подозрительной активности</span>
          </div>
        </div>
      </div>
    </div>
  );
}
