import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { TelemetryEvent } from '../api/types';
import { Activity, Clock, Shield, Server } from 'lucide-react';

export const SimpleEventsList: React.FC = () => {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📡 Fetching events for SimpleEventsList...');
        
        const response = await apiClient.getEvents();
        console.log('📥 Received response:', response);
        
        // Безопасное извлечение событий
        let eventsList: TelemetryEvent[] = [];
        if (Array.isArray(response)) {
          eventsList = response;
        } else if (response && Array.isArray(response.events)) {
          eventsList = response.events;
        }
        
        console.log('✅ Setting events list:', eventsList.length, 'events');
        setEvents(eventsList);
        
      } catch (err) {
        console.error('❌ Error loading events:', err);
        setError('Ошибка загрузки событий');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Безопасное получение имени хоста
  const getHostName = (event: TelemetryEvent): string => {
    if (event.host && typeof event.host === 'object' && event.host.hostname) {
      return event.host.hostname;
    }
    if (event.source && typeof event.source === 'string') {
      return event.source;
    }
    return 'Unknown Host';
  };

  // Получение цвета критичности
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'info': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Форматирование времени
  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('ru-RU');
    } catch {
      return 'Неизвестно';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Загрузка событий...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ошибка загрузки</h3>
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Мониторинг событий</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Простой просмотр событий системы ({events.length} событий)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Обновляется автоматически</span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Нет событий</h3>
          <p className="text-gray-500 dark:text-gray-400">События появятся здесь автоматически</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Время
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Server className="h-4 w-4 mr-2" />
                      Хост
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Тип события
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Критичность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID события
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event, index) => (
                  <tr key={event.event_id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatTime(event.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Server className="h-4 w-4 text-gray-400 mr-2" />
                        {getHostName(event)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {event.event_type || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(event.severity || 'info')}`}>
                        {event.severity || 'info'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {event.event_id ? event.event_id.substring(0, 12) + '...' : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex">
          <Activity className="h-5 w-5 text-blue-400" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Информация о мониторинге
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <ul className="list-disc list-inside space-y-1">
                <li>Автоматическое обновление каждые 30 секунд</li>
                <li>Простое отображение без сложных фильтров</li>
                <li>Безопасная обработка всех типов событий</li>
                <li>События отсортированы по времени (новые сверху)</li>
              </ul>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-xs text-blue-600 dark:text-blue-300 mb-2">
              Нужны расширенные функции?
            </div>
            <div className="text-xs text-blue-500 dark:text-blue-400">
              Используйте вкладку "События (расширенные)" для импорта, экспорта и управления событиями
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
