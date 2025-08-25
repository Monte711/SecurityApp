import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FolderOpen,
  Settings,
  Calendar,
  Database,
  Eye,
  Copy
} from 'lucide-react';
import { hostApiClient } from '../api/hostApi';
import { AutorunsData, AutorunItem } from '../types/hostTypes';

interface AutorunsTableProps {
  hostId: string;
  className?: string;
}

interface AutorunWithType extends AutorunItem {
  type: 'startup_programs' | 'run_keys' | 'services' | 'scheduled_tasks';
  key?: string;
}

export const AutorunsTable: React.FC<AutorunsTableProps> = ({ 
  hostId, 
  className = '' 
}) => {
  const [autorunsData, setAutorunsData] = useState<AutorunsData>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'startup_programs' | 'run_keys' | 'services' | 'scheduled_tasks'>('all');
  const [filterRisk, setFilterRisk] = useState(false);
  const [selectedAutorun, setSelectedAutorun] = useState<AutorunWithType | null>(null);

  const loadAutoruns = async () => {
    setLoading(true);
    try {
      const data = await hostApiClient.getHostAutoruns(hostId);
      setAutorunsData(data);
    } catch (error) {
      console.error('Failed to load autoruns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hostId) {
      loadAutoruns();
    }
  }, [hostId]);

  // Объединяем все типы автозапусков в одну таблицу
  const allAutoruns: AutorunWithType[] = React.useMemo(() => {
    const items: AutorunWithType[] = [];
    
    if (autorunsData.startup_programs) {
      autorunsData.startup_programs.forEach((item, index) => {
        items.push({ ...item, type: 'startup_programs', key: `startup_${index}` });
      });
    }
    
    if (autorunsData.run_keys) {
      autorunsData.run_keys.forEach((item, index) => {
        items.push({ ...item, type: 'run_keys', key: `run_${index}` });
      });
    }
    
    if (autorunsData.services) {
      autorunsData.services.forEach((item, index) => {
        items.push({ ...item, type: 'services', key: `service_${index}` });
      });
    }
    
    if (autorunsData.scheduled_tasks) {
      autorunsData.scheduled_tasks.forEach((item, index) => {
        items.push({ ...item, type: 'scheduled_tasks', key: `task_${index}` });
      });
    }
    
    return items;
  }, [autorunsData]);

  const filteredAutoruns = React.useMemo(() => {
    return allAutoruns.filter(item => {
      // Поиск
      const matchesSearch = !searchQuery || 
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.command && item.command.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));

      // Фильтр по типу
      const matchesType = filterType === 'all' || item.type === filterType;

      // Фильтр по риску (отсутствующие файлы, неподписанные и т.д.)
      const isRisky = !item.command || 
        (item.command && !item.command.trim()) ||
        (item.enabled === false);
      
      const matchesRisk = !filterRisk || isRisky;

      return matchesSearch && matchesType && matchesRisk;
    });
  }, [allAutoruns, searchQuery, filterType, filterRisk]);

  const exportAutoruns = () => {
    const csvHeaders = ['Тип', 'Название', 'Команда', 'Местоположение', 'Включен'];
    const csvData = filteredAutoruns.map(item => [
      getTypeLabel(item.type),
      item.name || '',
      item.command || '',
      item.location || '',
      item.enabled !== false ? 'Да' : 'Нет'
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoruns-${hostId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getTypeLabel = (type: AutorunWithType['type']) => {
    switch (type) {
      case 'startup_programs':
        return 'Автозапуск';
      case 'run_keys':
        return 'Реестр';
      case 'services':
        return 'Службы';
      case 'scheduled_tasks':
        return 'Планировщик';
      default:
        return 'Неизвестно';
    }
  };

  const getTypeIcon = (type: AutorunWithType['type']) => {
    switch (type) {
      case 'startup_programs':
        return <FolderOpen className="h-4 w-4 text-blue-500" />;
      case 'run_keys':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'services':
        return <Settings className="h-4 w-4 text-green-500" />;
      case 'scheduled_tasks':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskIcon = (item: AutorunWithType) => {
    const isRisky = !item.command || 
      (item.command && !item.command.trim()) ||
      (item.enabled === false);

    if (isRisky) {
      return (
        <div title="Возможный риск">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </div>
      );
    }
    return (
      <div title="В порядке">
        <CheckCircle className="h-4 w-4 text-green-500" />
      </div>
    );
  };

  const formatCommand = (command: string) => {
    if (!command) return '<не указана>';
    if (command.length > 80) {
      return command.substring(0, 77) + '...';
    }
    return command;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Заголовок и фильтры */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Автозапуск приложений ({filteredAutoruns.length} из {allAutoruns.length})
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadAutoruns}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Обновить список автозапуска"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportAutoruns}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Экспорт CSV
            </button>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск в автозапуске..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Фильтр по типу */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все типы</option>
            <option value="startup_programs">Автозапуск</option>
            <option value="run_keys">Реестр</option>
            <option value="services">Службы</option>
            <option value="scheduled_tasks">Планировщик</option>
          </select>

          {/* Фильтр рисков */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={filterRisk}
              onChange={(e) => setFilterRisk(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            Только риски
          </label>

          {/* Статистика */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Автозапуск: {(autorunsData.startup_programs?.length || 0)}</div>
              <div>Реестр: {(autorunsData.run_keys?.length || 0)}</div>
              <div>Службы: {(autorunsData.services?.length || 0)}</div>
              <div>Планировщик: {(autorunsData.scheduled_tasks?.length || 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
            <div className="text-gray-500 dark:text-gray-400">Загрузка автозапуска...</div>
          </div>
        ) : allAutoruns.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Данные об автозапуске недоступны
          </div>
        ) : filteredAutoruns.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Элементы не найдены по заданным критериям
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Команда
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Местоположение
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAutoruns.map((item, index) => (
                <tr key={item.key || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {item.name || '<без названия>'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300 max-w-md truncate" title={item.command || ''}>
                        {formatCommand(item.command || '')}
                      </span>
                      {item.command && (
                        <button
                          onClick={() => copyToClipboard(item.command!)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          title="Копировать команду"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={item.location || ''}>
                      {item.location || '<не указано>'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(item)}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.enabled !== false 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                      }`}>
                        {item.enabled !== false ? 'Включен' : 'Отключен'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedAutorun(item)}
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
      {selectedAutorun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Детали элемента автозапуска
                </h3>
                <button
                  onClick={() => setSelectedAutorun(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">Тип:</div>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedAutorun.type)}
                    <span>{getTypeLabel(selectedAutorun.type)}</span>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">Статус:</div>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedAutorun.enabled !== false 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                    }`}>
                      {selectedAutorun.enabled !== false ? 'Включен' : 'Отключен'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Название:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                  {selectedAutorun.name || '<без названия>'}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Команда:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all">
                  {selectedAutorun.command || '<не указана>'}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Местоположение:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all">
                  {selectedAutorun.location || '<не указано>'}
                </div>
              </div>

              {/* Рекомендации */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Рекомендации
                </h4>
                <div className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                  {!selectedAutorun.command && (
                    <div>• Команда не указана - возможно, элемент поврежден</div>
                  )}
                  {selectedAutorun.enabled === false && (
                    <div>• Элемент отключен - проверьте, нужен ли он</div>
                  )}
                  {selectedAutorun.command && selectedAutorun.command.toLowerCase().includes('temp') && (
                    <div>• Команда указывает на временную папку - потенциальный риск</div>
                  )}
                  {(!selectedAutorun.command || selectedAutorun.enabled === false || 
                    (selectedAutorun.command && selectedAutorun.command.toLowerCase().includes('temp'))) || (
                    <div>• Элемент выглядит в порядке</div>
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
