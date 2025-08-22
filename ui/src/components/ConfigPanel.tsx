import { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff } from 'lucide-react';
import { apiClient } from '../api/client';

interface ConfigPanelProps {
  className?: string;
  onModeChange?: (mode: 'mock' | 'real') => void;
  fullPage?: boolean;
}

export function ConfigPanel({ className = '', onModeChange, fullPage = false }: ConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(apiClient.getConfig());
  const [connectionStatus, setConnectionStatus] = useState<{
    testing: boolean;
    success: boolean | null;
    message: string;
  }>({
    testing: false,
    success: null,
    message: ''
  });

  // Auto-open if in full page mode
  useEffect(() => {
    if (fullPage) {
      setIsOpen(true);
    }
  }, [fullPage]);

  const testConnection = async () => {
    setConnectionStatus({ testing: true, success: null, message: 'Проверка соединения...' });
    
    try {
      const result = await apiClient.testConnection();
      setConnectionStatus({
        testing: false,
        success: result.success,
        message: result.message
      });
    } catch (error) {
      setConnectionStatus({
        testing: false,
        success: false,
        message: `Ошибка тестирования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      });
    }
  };

  const toggleMockMode = () => {
    const newUseMock = !config.useMock;
    apiClient.setConfig(config.baseUrl, newUseMock);
    setConfig(apiClient.getConfig());
    
    // Reset connection status when switching modes
    setConnectionStatus({ testing: false, success: null, message: '' });
    
    // Notify parent component about mode change
    if (onModeChange) {
      onModeChange(newUseMock ? 'mock' : 'real');
    }
  };

  const updateBaseUrl = (newUrl: string) => {
    apiClient.setConfig(newUrl, config.useMock);
    setConfig(apiClient.getConfig());
  };

  // Auto-test connection when in real API mode and panel opens
  useEffect(() => {
    if (isOpen && !config.useMock && connectionStatus.success === null) {
      testConnection();
    }
  }, [isOpen, config.useMock]);

  return (
    <div className={`relative ${className}`}>
      {!fullPage && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          title="Конфигурация API"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">
            {config.useMock ? 'Тестовый режим' : 'Живой API'}
          </span>
          {!config.useMock && (
            <div className="flex items-center">
              {connectionStatus.success === true && <Wifi className="w-4 h-4 text-green-600" />}
              {connectionStatus.success === false && <WifiOff className="w-4 h-4 text-red-600" />}
              {connectionStatus.testing && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </button>
      )}

      {(isOpen || fullPage) && (
        <div className={fullPage 
          ? "w-full space-y-6"
          : "absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50"
        }>
          {!fullPage && (
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Конфигурация API</h3>
          )}
          
          <div className={fullPage ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
            {/* Mode Toggle */}
            <div className={fullPage ? "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700" : ""}>
              {fullPage && (
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Режим работы</h4>
              )}
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.useMock}
                    onChange={toggleMockMode}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Использовать тестовые данные</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {config.useMock 
                        ? 'Использование симулированных данных для разработки'
                        : 'Подключение к живому API'
                      }
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* API Configuration */}
            <div className={fullPage ? "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700" : ""}>
              {fullPage && (
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Конфигурация API</h4>
              )}
              
              {/* API URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Базовый URL API
                </label>
                <input
                  type="url"
                  value={config.baseUrl}
                  onChange={(e) => updateBaseUrl(e.target.value)}
                  disabled={config.useMock}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600"
                  placeholder="http://localhost:8000"
                />
              </div>

              {/* Connection Test */}
              {!config.useMock && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Статус соединения</span>
                    <button
                      onClick={testConnection}
                      disabled={connectionStatus.testing}
                      className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded disabled:opacity-50"
                    >
                      {connectionStatus.testing ? 'Проверка...' : 'Тест соединения'}
                    </button>
                  </div>
                  
                  <div className={`px-4 py-3 rounded-md text-sm ${
                    connectionStatus.success === true 
                      ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : connectionStatus.success === false
                      ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      {connectionStatus.testing && (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {connectionStatus.success === true && <Wifi className="w-4 h-4" />}
                      {connectionStatus.success === false && <WifiOff className="w-4 h-4" />}
                      <span>{connectionStatus.message || 'Не протестировано'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Environment Info */}
            {fullPage && (
              <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Информация о системе</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Режим</dt>
                    <dd className="text-gray-500 dark:text-gray-400">Разработка</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Сборка</dt>
                    <dd className="text-gray-500 dark:text-gray-400">{import.meta.env.VITE_DEBUG_MODE === 'true' ? 'Отладка' : 'Релиз'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700 dark:text-gray-300">API</dt>
                    <dd className="text-gray-500 dark:text-gray-400">{config.useMock ? 'Тест' : 'Живой'}</dd>
                  </div>
                </div>
              </div>
            )}
            
            {!fullPage && (
              <div className="pt-2 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Окружение</h4>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <div>Режим: Разработка</div>
                  <div>Сборка: {import.meta.env.VITE_DEBUG_MODE === 'true' ? 'Отладка' : 'Релиз'}</div>
                  <div>API: {config.useMock ? 'Тест' : 'Живой'}</div>
                </div>
              </div>
            )}
          </div>

          {!fullPage && (
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
