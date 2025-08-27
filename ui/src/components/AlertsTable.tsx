import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { TelemetryEvent } from '../api/types';
import { Search, Filter, Download, Upload, X, Trash2 } from 'lucide-react';

export const AlertsTable: React.FC = () => {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('=== DEBUG: Fetching events ===');
        console.log('API URL:', 'http://localhost:8000/events');
        const data = await apiClient.getEvents();
        console.log('=== DEBUG: API Response ===', data);
        
        // Handle API response properly - extract events array
        if (Array.isArray(data)) {
          console.log('=== DEBUG: Data is array, length:', data.length);
          setEvents(data);
        } else if (data && Array.isArray(data.events)) {
          console.log('=== DEBUG: Data has events array, length:', data.events.length);
          setEvents(data.events);
        } else {
          console.log('=== DEBUG: No valid events found ===');
          setEvents([]);
        }
      } catch (error) {
        console.error('=== DEBUG: Error loading events ===', error);
        setEvents([]);
      } finally {
        console.log('=== DEBUG: Setting loading to false ===');
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = events.filter(event => {
    // Простая и безопасная фильтрация без доступа к hostname
    if (!event || typeof event !== 'object') return false;
    if (!event.event_id || !event.event_type) return false;
    
    // Только базовая фильтрация по критичности
    const matchesSeverity = filterSeverity === 'all' || event.severity === filterSeverity;
    
    // Простой поиск только по ID и типу события
    const eventId = event.event_id || '';
    const eventType = event.event_type || '';
    const matchesSearch = eventId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eventType.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      case 'info': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Критический';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      case 'info': return 'Информационный';
      default: return severity;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'new': return 'text-red-600 bg-red-50';
      case 'investigating': return 'text-yellow-600 bg-yellow-50';
      case 'action_requested': return 'text-orange-600 bg-orange-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'new': return 'Новое';
      case 'investigating': return 'Расследуется';
      case 'action_requested': return 'Требует действий';
      case 'resolved': return 'Решено';
      default: return status || 'Неизвестно';
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить это событие?')) {
      try {
        await apiClient.deleteEvent(eventId);
        setEvents(prev => prev.filter(event => event.event_id !== eventId));
        setSelectedEvent(null);
      } catch (error) {
        console.error('Ошибка удаления события:', error);
        alert('Ошибка при удалении события');
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          
          // Normalize the imported event structure to match our TelemetryEvent interface
          const newEvent: TelemetryEvent = {
            event_id: `imported_${Date.now()}`,
            timestamp: new Date().toISOString(),
            event_type: jsonData.event_type || 'imported',
            severity: jsonData.severity || 'medium',
            status: 'new',
            ...jsonData
          };
          
          // If source_host exists but not host, create proper host structure
          if (jsonData.source_host && !jsonData.host) {
            newEvent.host = {
              host_id: `host-${Date.now()}`,
              hostname: jsonData.source_host,
              domain: jsonData.domain || 'unknown'
            };
          }
          
          // If neither host nor source_host exists, use source field
          if (!newEvent.host && !newEvent.source) {
            newEvent.source = jsonData.source_host || jsonData.hostname || 'Imported Event';
          }
          
          console.log('📥 Importing event with structure:', newEvent);
          setEvents(prev => [newEvent, ...prev]);
          setShowImport(false);
        } catch (error) {
          console.error('Import error:', error);
          alert('Неверный формат JSON файла');
        }
      };
      reader.readAsText(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Загрузка событий...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Управление событиями</h2>
          <p className="text-gray-600 dark:text-gray-400">Расширенные функции: импорт, экспорт, удаление событий</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Импорт
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск событий..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Все уровни</option>
            <option value="critical">Критический</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
            <option value="info">Информационный</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ID события
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Хост
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Тип события
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Время
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Критичность
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
              {filteredEvents.map((event) => {
                if (!event || !event.event_id) {
                  console.warn('Skipping invalid event:', event);
                  return null;
                }
                return (
                <tr key={event.event_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                    {event.event_id ? event.event_id.substring(0, 12) + '...' : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {(typeof event.host === 'string' ? event.host : 
                      (event.host && typeof event.host === 'object' ? event.host.hostname : null)) || 
                     event.source || 'Unknown Host'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {event.event_type || 'Unknown Event'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {event.timestamp ? new Date(event.timestamp).toLocaleString('ru-RU') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity || 'info')}`}>
                      {getSeverityLabel(event.severity || 'info')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                      {getStatusLabel(event.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Подробно
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.event_id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">События не найдены.</p>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Импорт события</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Выберите JSON файл с данными события для импорта.
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Детали события</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.event_id)}
                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </button>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID события</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{selectedEvent.event_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Хост источник</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {(typeof selectedEvent.host === 'string' ? selectedEvent.host : 
                      (selectedEvent.host && typeof selectedEvent.host === 'object' ? selectedEvent.host.hostname : null)) || 
                     selectedEvent.source || 'Unknown Host'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Тип события</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedEvent.event_type}</p>
                </div>
                {selectedEvent.description && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Описание</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedEvent.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Критичность</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(selectedEvent.severity)}`}>
                    {getSeverityLabel(selectedEvent.severity)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Время</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{new Date(selectedEvent.timestamp).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Статус</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEvent.status)}`}>
                    {getStatusLabel(selectedEvent.status)}
                  </span>
                </div>
              </div>
              
              {/* Display formatted details if available */}
              {selectedEvent.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Детали события</label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    {Object.entries(selectedEvent.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{key}:</span>
                        <span className="text-sm text-gray-900 dark:text-white">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Fallback to raw data if no formatted details */}
              {!selectedEvent.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Данные события</label>
                  <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedEvent.raw_data || selectedEvent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
