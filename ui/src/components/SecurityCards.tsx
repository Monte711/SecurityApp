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
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Безопасность</h3>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Безопасность</h3>
        <div className="text-center py-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadSecurityData}
            className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Безопасность</h3>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Нет данных</p>
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
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Параметры безопасности системы</h3>
        <button
          onClick={() => handleRefresh()}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
      
      <div className="mt-6 text-xs text-gray-500">
        Последнее обновление: {new Date(securityData.lastUpdated).toLocaleString('ru-RU')}
      </div>

      {/* Общие рекомендации */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          🛡️ Общие рекомендации по безопасности
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• Регулярно обновляйте операционную систему и установленное программное обеспечение</div>
          <div>• Используйте сильные пароли и многофакторную аутентификацию</div>
          <div>• Ограничьте права пользователей до минимально необходимых</div>
          <div>• Регулярно создавайте резервные копии важных данных</div>
          <div>• Мониторьте журналы событий на предмет подозрительной активности</div>
        </div>
      </div>
    </div>
  );
}
