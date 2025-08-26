import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download,
  RefreshCw,
  AlertTriangle,
  Eye,
  Filter
} from 'lucide-react';
import { hostApiClient } from '../api/hostApi';
import { Finding } from '../types/hostTypes';

interface FindingsTableProps {
  hostId: string;
  className?: string;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({ 
  hostId, 
  className = '' 
}) => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const loadFindings = async () => {
    setLoading(true);
    try {
      const data = await hostApiClient.getHostFindings(hostId);
      setFindings(data);
    } catch (error) {
      console.error('Failed to load findings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hostId) {
      loadFindings();
    }
  }, [hostId]);

  const filteredFindings = React.useMemo(() => {
    return findings.filter(finding => {
      const matchesSearch = !searchQuery || 
        finding.message_ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        finding.evidence.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity = filterSeverity === 'all' || finding.severity === filterSeverity;

      return matchesSearch && matchesSeverity;
    });
  }, [findings, searchQuery, filterSeverity]);

  const exportFindings = () => {
    const csvHeaders = ['Критичность', 'Правило', 'Сообщение', 'Доказательства'];
    const csvData = filteredFindings.map(finding => [
      finding.severity,
      finding.rule_id,
      finding.message_ru,
      finding.evidence
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `findings-${hostId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getSeverityPriority = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  };

  // Сортируем по критичности
  const sortedFindings = [...filteredFindings].sort((a, b) => 
    getSeverityPriority(b.severity) - getSeverityPriority(a.severity)
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Заголовок и фильтры */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Рекомендации по безопасности ({filteredFindings.length} из {findings.length})
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadFindings}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Обновить рекомендации"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportFindings}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Экспорт CSV
            </button>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск рекомендаций..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Фильтр по критичности */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все уровни</option>
            <option value="critical">Критические</option>
            <option value="high">Высокие</option>
            <option value="medium">Средние</option>
            <option value="low">Низкие</option>
          </select>

          {/* Статистика */}
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="grid grid-cols-4 gap-1 text-xs">
              {['critical', 'high', 'medium', 'low'].map(severity => {
                const count = findings.filter(f => f.severity === severity).length;
                return (
                  <div key={severity} className="text-center">
                    <div className={`px-1 py-0.5 rounded text-xs ${getSeverityColor(severity as Finding['severity'])}`}>
                      {count}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 capitalize">
                      {severity.charAt(0).toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
            <div className="text-gray-500 dark:text-gray-400">Загрузка рекомендаций...</div>
          </div>
        ) : findings.length === 0 ? (
          <div className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Отличная работа!
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              Рекомендации по безопасности не найдены. Система находится в хорошем состоянии.
            </p>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Рекомендации не найдены по заданным критериям
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Критичность
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Правило
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedFindings.map((finding, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(finding.severity)}`}>
                      {finding.severity.toUpperCase()}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {finding.rule_id}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {finding.message_ru}
                    </div>
                    {finding.evidence && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md truncate">
                        {finding.evidence}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedFinding(finding)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      title="Показать детали"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Модальное окно с деталями */}
      {selectedFinding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Детали рекомендации
                </h3>
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">Критичность:</div>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedFinding.severity)}`}>
                      {selectedFinding.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">ID правила:</div>
                  <div className="mt-1 font-mono text-sm">{selectedFinding.rule_id}</div>
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Описание проблемы:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                  {selectedFinding.message_ru}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Доказательства:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all">
                  {selectedFinding.evidence}
                </div>
              </div>

              {/* Рекомендации по устранению */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Рекомендации по устранению:
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  {selectedFinding.rule_id === 'AUTORUN_MISSING_FILE' && (
                    <>
                      <div>• Удалите неработающую запись из автозапуска</div>
                      <div>• Проверьте, не была ли программа перемещена или удалена</div>
                      <div>• При необходимости переустановите программу</div>
                    </>
                  )}
                  {selectedFinding.rule_id.includes('DEFENDER') && (
                    <>
                      <div>• Обновите Windows Defender до последней версии</div>
                      <div>• Включите автоматическое обновление</div>
                      <div>• Проверьте настройки групповых политик</div>
                    </>
                  )}
                  {selectedFinding.rule_id.includes('FIREWALL') && (
                    <>
                      <div>• Включите брандмауэр Windows</div>
                      <div>• Настройте правила для необходимых приложений</div>
                      <div>• Проверьте настройки сетевых профилей</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
