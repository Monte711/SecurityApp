import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { hostApiClient } from '../api/hostApi';
import { ProcessInfo } from '../types/hostTypes';

interface ProcessesTableProps {
  hostId: string;
  className?: string;
}

export const ProcessesTable: React.FC<ProcessesTableProps> = ({ 
  hostId, 
  className = '' 
}) => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSigned, setFilterSigned] = useState<'all' | 'signed' | 'unsigned'>('all');
  const [filterSuspicious, setFilterSuspicious] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const loadProcesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hostApiClient.getHostProcesses(hostId);
      setProcesses(data);
    } catch (error) {
      console.error('Failed to load processes:', error);
      setError(error instanceof Error ? error.message : 'Ошибка загрузки процессов');
      setProcesses([]); // Сбрасываем список процессов при ошибке
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hostId) {
      loadProcesses();
    }
  }, [hostId]);

  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      // Поиск по имени, пути или пользователю
      const matchesSearch = !searchQuery || 
        process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.exe_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        process.cmdline.toLowerCase().includes(searchQuery.toLowerCase());

      // Фильтр по подписи
      const matchesSigned = filterSigned === 'all' || 
        (filterSigned === 'signed' && process.signature?.status === 'valid') ||
        (filterSigned === 'unsigned' && (!process.signature || process.signature.status !== 'valid'));

      // Фильтр по подозрительности
      const isSuspicious = process.exe_path.toLowerCase().includes('temp') ||
        process.exe_path.toLowerCase().includes('appdata') ||
        !process.exe_path ||
        !process.name;
      
      const matchesSuspicious = !filterSuspicious || isSuspicious;

      return matchesSearch && matchesSigned && matchesSuspicious;
    });
  }, [processes, searchQuery, filterSigned, filterSuspicious]);

  const exportProcesses = () => {
    const csvHeaders = ['PID', 'PPID', 'Имя', 'Путь', 'Пользователь', 'Командная строка', 'SHA256', 'Подпись'];
    const csvData = filteredProcesses.map(p => [
      p.pid,
      p.ppid,
      p.name,
      p.exe_path,
      p.username,
      p.cmdline,
      p.sha256 || '',
      p.signature?.status || 'unknown'
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processes-${hostId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getSignatureIcon = (process: ProcessInfo) => {
    if (!process.signature || process.signature.status !== 'valid') {
      return (
        <div title="Не подписан">
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </div>
      );
    }
    return (
      <div title="Подписан">
        <CheckCircle className="h-4 w-4 text-green-500" />
      </div>
    );
  };

  const getSuspiciousIcon = (process: ProcessInfo) => {
    const isSuspicious = process.exe_path.toLowerCase().includes('temp') ||
      process.exe_path.toLowerCase().includes('appdata') ||
      !process.exe_path ||
      !process.name;

    if (isSuspicious) {
      return (
        <div title="Подозрительный путь">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </div>
      );
    }
    return null;
  };

  const toggleRowExpanded = (pid: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(pid)) {
      newExpanded.delete(pid);
    } else {
      newExpanded.add(pid);
    }
    setExpandedRows(newExpanded);
  };

  const formatPath = (path: string) => {
    if (path.length > 50) {
      return '...' + path.slice(-47);
    }
    return path;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Заголовок и фильтры */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Запущенные процессы ({filteredProcesses.length} из {processes.length})
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadProcesses}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Обновить список процессов"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportProcesses}
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
              placeholder="Поиск процессов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Фильтр по подписи */}
          <select
            value={filterSigned}
            onChange={(e) => setFilterSigned(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все подписи</option>
            <option value="signed">Только подписанные</option>
            <option value="unsigned">Только неподписанные</option>
          </select>

          {/* Фильтр подозрительных */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={filterSuspicious}
              onChange={(e) => setFilterSuspicious(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            Только подозрительные
          </label>

          {/* Показать детали */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            Подробный режим
          </label>
        </div>
      </div>

      {/* Таблица */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
            <div className="text-gray-500 dark:text-gray-400">Загрузка процессов...</div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="text-red-500 dark:text-red-400 mb-2">{error}</div>
            <button
              onClick={loadProcesses}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Повторить попытку
            </button>
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {processes.length === 0 ? 'Нет данных о процессах' : 'Процессы не найдены по заданным критериям'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {showDetails && <span className="w-4"></span>}
                  PID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Процесс
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Путь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Пользователь
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
              {filteredProcesses.map((process) => (
                <React.Fragment key={process.pid}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {showDetails && (
                          <button
                            onClick={() => toggleRowExpanded(process.pid)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                          >
                            {expandedRows.has(process.pid) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        )}
                        <span className="font-mono">{process.pid}</span>
                        {process.ppid && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ← {process.ppid}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {process.name || '<неизвестно>'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs max-w-xs truncate" title={process.exe_path}>
                          {formatPath(process.exe_path || '<неизвестно>')}
                        </span>
                        {process.exe_path && (
                          <button
                            onClick={() => copyToClipboard(process.exe_path)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                            title="Копировать путь"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {process.username.split('\\').pop() || '<неизвестно>'}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getSignatureIcon(process)}
                        {getSuspiciousIcon(process)}
                        {process.signature?.publisher && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {process.signature.publisher}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProcess(process);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="Показать детали"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {process.sha256 && (
                          <button
                            onClick={() => copyToClipboard(process.sha256!)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                            title="Копировать SHA256"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Развернутая строка с деталями */}
                  {showDetails && expandedRows.has(process.pid) && (
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-3 text-sm">
                          {/* Командная строка */}
                          <div>
                            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Командная строка:
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-xs break-all">
                              {process.cmdline || '<не указана>'}
                            </div>
                          </div>
                          
                          {/* Хеш-сумма */}
                          {process.sha256 && (
                            <div>
                              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                SHA256:
                              </div>
                              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-xs break-all flex items-center justify-between">
                                <span>{process.sha256}</span>
                                <button
                                  onClick={() => copyToClipboard(process.sha256!)}
                                  className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Информация о подписи */}
                          {process.signature && (
                            <div>
                              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Цифровая подпись:
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span>Статус:</span>
                                  <span className={process.signature.status === 'valid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {process.signature.status === 'valid' ? 'Действительна' : 'Недействительна'}
                                  </span>
                                </div>
                                {process.signature.publisher && (
                                  <div className="flex justify-between">
                                    <span>Издатель:</span>
                                    <span>{process.signature.publisher}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Модальное окно с деталями процесса */}
      {selectedProcess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Детали процесса: {selectedProcess.name}
                </h3>
                <button
                  onClick={() => setSelectedProcess(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">PID:</div>
                  <div className="font-mono">{selectedProcess.pid}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">PPID:</div>
                  <div className="font-mono">{selectedProcess.ppid || 'N/A'}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">Имя процесса:</div>
                  <div>{selectedProcess.name}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">Пользователь:</div>
                  <div>{selectedProcess.username}</div>
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Путь к исполняемому файлу:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all">
                  {selectedProcess.exe_path}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Командная строка:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all">
                  {selectedProcess.cmdline}
                </div>
              </div>
              
              {selectedProcess.sha256 && (
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">SHA256:</div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono text-sm break-all">
                    {selectedProcess.sha256}
                  </div>
                </div>
              )}
              
              {selectedProcess.signature && (
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Цифровая подпись:</div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Статус:</span>
                        <span className={selectedProcess.signature.status === 'valid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {selectedProcess.signature.status === 'valid' ? 'Действительна' : 'Недействительна'}
                        </span>
                      </div>
                      {selectedProcess.signature.publisher && (
                        <div className="flex justify-between">
                          <span>Издатель:</span>
                          <span>{selectedProcess.signature.publisher}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
