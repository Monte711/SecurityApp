import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download,
  RefreshCw,
  Activity,
  Monitor,
  Cpu
} from 'lucide-react';
import { hostApiClient } from '../api/hostApi';
import { HostPostureEvent, Finding } from '../types/hostTypes';

interface HostSummaryCardProps {
  hostId: string;
  className?: string;
}

export const HostSummaryCard: React.FC<HostSummaryCardProps> = ({ 
  hostId, 
  className = '' 
}) => {
  const [hostData, setHostData] = useState<HostPostureEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHostData = async () => {
    setLoading(true);
    try {
      const data = await hostApiClient.getHostPosture(hostId);
      setHostData(data);
    } catch (error) {
      console.error('Failed to load host data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hostId) {
      loadHostData();
    }
  }, [hostId]);

  const exportHostData = () => {
    if (!hostData) return;
    
    const blob = new Blob([JSON.stringify(hostData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `host-${hostData.host_info.hostname}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const groupFindingsBySeverity = (findings: Finding[]) => {
    return findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  if (loading || !hostData) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const findingsBySeverity = groupFindingsBySeverity(hostData.findings || []);
  const totalFindings = hostData.findings?.length || 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Заголовок */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {totalFindings > 0 ? (
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-500" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {hostData.host_info.hostname}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {hostData.host_info.host_id}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadHostData}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Обновить данные"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportHostData}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Экспорт JSON
            </button>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Последнее обновление: {new Date(hostData.received_at).toLocaleString()}
        </div>
      </div>

      {/* Основные метрики */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Система */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Monitor className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Операционная система</div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                {hostData.host_info.os.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {hostData.host_info.os.version}
              </div>
            </div>
          </div>

          {/* Аптайм */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Activity className="h-8 w-8 text-green-500" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Время работы</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatUptime(hostData.host_info.uptime_seconds)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {hostData.host_info.uptime_seconds} сек
              </div>
            </div>
          </div>

          {/* Процессы */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Cpu className="h-8 w-8 text-purple-500" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Активные процессы</div>
              <div className="font-semibold text-gray-900 dark:text-white text-lg">
                {hostData.inventory?.processes?.length || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                процессов запущено
              </div>
            </div>
          </div>

          {/* Рекомендации */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Shield className="h-8 w-8 text-orange-500" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Рекомендации</div>
              <div className="font-semibold text-gray-900 dark:text-white text-lg">
                {totalFindings}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {totalFindings > 0 ? 'требуют внимания' : 'все в порядке'}
              </div>
            </div>
          </div>
        </div>

        {/* Детализация рекомендаций */}
        {totalFindings > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Рекомендации по безопасности
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { key: 'critical', label: 'Критические', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
                { key: 'high', label: 'Высокие', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' },
                { key: 'medium', label: 'Средние', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' },
                { key: 'low', label: 'Низкие', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' }
              ].map(({ key, label, color }) => (
                <div key={key} className="text-center">
                  <div className={`text-2xl font-bold ${color} rounded-lg py-2`}>
                    {findingsBySeverity[key] || 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Последние рекомендации */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Последние рекомендации:</div>
              {(hostData.findings || []).slice(0, 3).map((finding, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                    {finding.severity.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-white">{finding.message_ru}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Правило: {finding.rule_id}
                    </div>
                  </div>
                </div>
              ))}
              
              {(hostData.findings || []).length > 3 && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  ... и ещё {(hostData.findings || []).length - 3} рекомендаций
                </div>
              )}
            </div>
          </div>
        )}

        {/* Агент и метаданные */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h5 className="font-medium text-gray-900 dark:text-white">Информация об агенте</h5>
            <div className="space-y-1 text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>ID агента:</span>
                <span className="font-mono text-xs">{hostData.agent_id}</span>
              </div>
              <div className="flex justify-between">
                <span>User-Agent:</span>
                <span className="font-mono text-xs">{hostData.user_agent}</span>
              </div>
              <div className="flex justify-between">
                <span>Формат данных:</span>
                <span>{hostData.format_type}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-medium text-gray-900 dark:text-white">Метаданные сбора</h5>
            <div className="space-y-1 text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Коллектор:</span>
                <span>{hostData.metadata?.collector || 'неизвестно'}</span>
              </div>
              <div className="flex justify-between">
                <span>Версия схемы:</span>
                <span>{hostData.metadata?.schema_version || 'неизвестно'}</span>
              </div>
              <div className="flex justify-between">
                <span>Индекс:</span>
                <span className="font-mono text-xs">{hostData.index_name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
