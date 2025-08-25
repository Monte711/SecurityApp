import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download,
  Copy,
  Eye,
  RefreshCw
} from 'lucide-react';
import { hostApiClient } from '../api/hostApi';
import { HostPostureEvent } from '../types/hostTypes';

interface RawJsonModalProps {
  hostId: string;
  onClose: () => void;
}

export const RawJsonModal: React.FC<RawJsonModalProps> = ({ hostId, onClose }) => {
  const [hostData, setHostData] = useState<HostPostureEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadHostData = async () => {
    setLoading(true);
    try {
      const data = await hostApiClient.getHostPosture(hostId);
      setHostData(data);
    } catch (error) {
      console.error('Failed to load host data for JSON:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hostId) {
      loadHostData();
    }
  }, [hostId]);

  const copyToClipboard = async () => {
    if (!hostData) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(hostData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadJson = () => {
    if (!hostData) return;
    
    const jsonString = JSON.stringify(hostData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `host-raw-data-${hostData.host_info.hostname}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Заголовок */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Raw JSON данные хоста
              </h3>
              {hostData && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {hostData.host_info.hostname} ({hostData.host_info.host_id})
                </p>
              )}
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
                onClick={copyToClipboard}
                disabled={!hostData}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center gap-2 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
              
              <button
                onClick={downloadJson}
                disabled={!hostData}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Скачать
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <div className="text-gray-500 dark:text-gray-400">Загрузка данных...</div>
              </div>
            </div>
          ) : !hostData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <div className="text-gray-500 dark:text-gray-400">Данные не найдены</div>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto h-full text-sm font-mono">
                {JSON.stringify(hostData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Футер с информацией */}
        {hostData && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <div className="font-medium">Event ID:</div>
                <div className="font-mono text-xs">{hostData.event_id}</div>
              </div>
              <div>
                <div className="font-medium">Индекс:</div>
                <div className="font-mono text-xs">{hostData.index_name}</div>
              </div>
              <div>
                <div className="font-medium">Получено:</div>
                <div className="text-xs">{new Date(hostData.received_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="font-medium">Размер:</div>
                <div className="text-xs">
                  {(JSON.stringify(hostData).length / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
