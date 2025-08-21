import { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff } from 'lucide-react';
import { apiClient } from '../api/client';

interface ConfigPanelProps {
  className?: string;
  onModeChange?: (mode: 'mock' | 'real') => void;
}

export function ConfigPanel({ className = '', onModeChange }: ConfigPanelProps) {
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <h3 className="font-semibold text-gray-900 mb-3">Конфигурация API</h3>
          
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.useMock}
                  onChange={toggleMockMode}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Использовать тестовые данные</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {config.useMock 
                  ? 'Использование симулированных данных для разработки'
                  : 'Подключение к живому API'
                }
              </p>
            </div>

            {/* API URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Базовый URL API
              </label>
              <input
                type="url"
                value={config.baseUrl}
                onChange={(e) => updateBaseUrl(e.target.value)}
                disabled={config.useMock}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="http://localhost:8000"
              />
            </div>

            {/* Connection Test */}
            {!config.useMock && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Статус соединения</span>
                  <button
                    onClick={testConnection}
                    disabled={connectionStatus.testing}
                    className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded disabled:opacity-50"
                  >
                    {connectionStatus.testing ? 'Проверка...' : 'Тест'}
                  </button>
                </div>
                
                <div className={`px-3 py-2 rounded-md text-sm ${
                  connectionStatus.success === true 
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : connectionStatus.success === false
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-gray-50 border border-gray-200 text-gray-600'
                }`}>
                  <div className="flex items-center gap-2">
                    {connectionStatus.testing && (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    {connectionStatus.success === true && <Wifi className="w-3 h-3" />}
                    {connectionStatus.success === false && <WifiOff className="w-3 h-3" />}
                    <span>{connectionStatus.message || 'Не протестировано'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Environment Info */}
            <div className="pt-2 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Окружение</h4>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Режим: Разработка</div>
                <div>Сборка: {import.meta.env.VITE_DEBUG_MODE === 'true' ? 'Отладка' : 'Релиз'}</div>
                <div>API: {config.useMock ? 'Тест' : 'Живой'}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
