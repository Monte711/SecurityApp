import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { hostApiClient } from '../api/hostApi';
import { HostSummary } from '../types/hostTypes';

interface HostsSidebarProps {
  selectedHostId?: string;
  onHostSelect: (hostId: string) => void;
  className?: string;
}

export const HostsSidebar: React.FC<HostsSidebarProps> = ({ 
  selectedHostId, 
  onHostSelect, 
  className = '' 
}) => {
  const [hosts, setHosts] = useState<HostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadHosts = async () => {
    setLoading(true);
    try {
      const response = await hostApiClient.getHosts();
      setHosts(response.hosts);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load hosts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHosts();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadHosts, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredHosts = hosts.filter(host => {
    const matchesSearch = !searchQuery || 
      host.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      host.host_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || host.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: HostSummary['status']) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: HostSummary['status']) => {
    switch (status) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'ok':
        return 'border-l-green-500 bg-white dark:bg-gray-800';
      default:
        return 'border-l-gray-300 bg-white dark:bg-gray-800';
    }
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'сейчас';
    if (diffMinutes < 60) return `${diffMinutes}м назад`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}ч назад`;
    return `${Math.floor(diffMinutes / 1440)}д назад`;
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Хосты
          </h2>
          <button
            onClick={loadHosts}
            disabled={loading}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Обновлено: {lastRefresh.toLocaleTimeString()}
        </div>

        {/* Поиск */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск хостов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Фильтр по статусу */}
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Все', icon: Filter },
            { key: 'critical', label: 'Критич.', icon: AlertTriangle, color: 'text-red-600' },
            { key: 'warning', label: 'Предупр.', icon: AlertTriangle, color: 'text-yellow-600' },
            { key: 'ok', label: 'ОК', icon: CheckCircle, color: 'text-green-600' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key as any)}
              className={`flex-1 px-2 py-1 text-xs rounded border flex items-center justify-center gap-1 ${
                statusFilter === key
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className={`h-3 w-3 ${color || ''}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Список хостов */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Загрузка хостов...
          </div>
        ) : filteredHosts.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' ? 'Хосты не найдены' : 'Нет активных хостов'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredHosts.map((host) => (
              <div
                key={host.host_id}
                onClick={() => onHostSelect(host.host_id)}
                className={`
                  p-3 border-l-4 rounded-r cursor-pointer transition-all duration-150
                  ${getStatusColor(host.status)}
                  ${selectedHostId === host.host_id 
                    ? 'ring-2 ring-blue-500 shadow-sm' 
                    : 'hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                {/* Заголовок хоста */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(host.status)}
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {host.hostname}
                    </span>
                  </div>
                  {host.findings_count > 0 && (
                    <span className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs px-2 py-0.5 rounded-full">
                      {host.findings_count}
                    </span>
                  )}
                </div>

                {/* Детали */}
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>ОС:</span>
                    <span className="truncate ml-2">{host.os || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Findings:</span>
                    <span>{host.findings_count}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Последний контакт:</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatLastSeen(host.last_seen)}</span>
                    </div>
                  </div>

                  {/* Findings breakdown */}
                  {host.findings_count > 0 && (
                    <div className="flex justify-between text-xs">
                      <span>Рекомендации:</span>
                      <div className="flex gap-1">
                        {host.severity_counts.critical > 0 && (
                          <span className="text-red-600 dark:text-red-400">{host.severity_counts.critical}К</span>
                        )}
                        {host.severity_counts.high > 0 && (
                          <span className="text-orange-600 dark:text-orange-400">{host.severity_counts.high}В</span>
                        )}
                        {host.severity_counts.medium > 0 && (
                          <span className="text-yellow-600 dark:text-yellow-400">{host.severity_counts.medium}С</span>
                        )}
                        {host.severity_counts.low > 0 && (
                          <span className="text-blue-600 dark:text-blue-400">{host.severity_counts.low}Н</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Статистика внизу */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
        <div className="text-xs text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-2">
          <div>Всего хостов: {hosts.length}</div>
          <div>Выбрано: {filteredHosts.length}</div>
        </div>
      </div>
    </div>
  );
};
