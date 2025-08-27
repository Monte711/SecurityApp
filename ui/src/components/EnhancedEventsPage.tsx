import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { TelemetryEvent } from '../api/types';
import { 
  Search, Filter, Download, Upload, X, Trash2, RefreshCw, 
  Clock, Server, Shield, Eye, FileJson,
  AlertCircle, CheckCircle, XCircle, Info, Zap
} from 'lucide-react';

// Типы для улучшенного UX
type ViewMode = 'table' | 'cards';
type TimeFilter = '1h' | '24h' | '7d' | '30d' | 'custom';

interface EventFilters {
  search: string;
  severity: string;
  eventType: string;
  timeFilter: TimeFilter;
  startDate?: string;
  endDate?: string;
}

export const EnhancedEventsPage: React.FC = () => {
  // State management
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    severity: 'all',
    eventType: 'all',
    timeFilter: '24h'
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📡 Fetching events for Enhanced Events Page...');
        
        const response = await apiClient.getEvents();
        console.log('📥 Received response:', response);
        
        let eventsList: TelemetryEvent[] = [];
        if (Array.isArray(response)) {
          eventsList = response;
        } else if (response && Array.isArray(response.events)) {
          eventsList = response.events;
        }
        
        // Sort by timestamp (newest first)
        eventsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        console.log('✅ Setting events list:', eventsList.length, 'events');
        setEvents(eventsList);
        
      } catch (err) {
        console.error('❌ Error loading events:', err);
        setError('Ошибка загрузки событий. Проверьте подключение к серверу.');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (!event || typeof event !== 'object') return false;
      if (!event.event_id || !event.event_type) return false;
      
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const hostName = typeof event.host === 'string' ? event.host : 
                        (event.host && typeof event.host === 'object' ? event.host.hostname : '');
        const searchableText = [
          event.event_id,
          event.event_type,
          hostName || event.source || '',
          event.description || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      // Severity filter
      if (filters.severity !== 'all' && event.severity !== filters.severity) {
        return false;
      }
      
      // Event type filter
      if (filters.eventType !== 'all' && event.event_type !== filters.eventType) {
        return false;
      }
      
      // Time filter
      if (filters.timeFilter !== 'custom') {
        const eventTime = new Date(event.timestamp).getTime();
        const now = Date.now();
        let timeThreshold = 0;
        
        switch (filters.timeFilter) {
          case '1h': timeThreshold = 60 * 60 * 1000; break;
          case '24h': timeThreshold = 24 * 60 * 60 * 1000; break;
          case '7d': timeThreshold = 7 * 24 * 60 * 60 * 1000; break;
          case '30d': timeThreshold = 30 * 24 * 60 * 60 * 1000; break;
        }
        
        if (now - eventTime > timeThreshold) return false;
      }
      
      return true;
    });
  }, [events, filters]);

  // Paginated events
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  // Get unique event types for filter dropdown
  const eventTypes = useMemo(() => {
    const types = new Set(events.map(e => e.event_type).filter(Boolean));
    return Array.from(types).sort();
  }, [events]);

  // Utility functions
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200';
      case 'info': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Zap className="h-4 w-4" />;
      case 'low': return <Info className="h-4 w-4" />;
      case 'info': return <CheckCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Критический';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      case 'info': return 'Информационный';
      default: return severity || 'Неизвестно';
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return {
        date: date.toLocaleDateString('ru-RU'),
        time: date.toLocaleTimeString('ru-RU')
      };
    } catch {
      return { date: 'Неизвестно', time: '' };
    }
  };

  const getHostName = (event: TelemetryEvent): string => {
    // Сначала проверяем, если host это строка (как в новом API)
    if (event.host && typeof event.host === 'string') {
      return event.host;
    }
    // Затем проверяем, если host это объект (старый формат)
    if (event.host && typeof event.host === 'object' && event.host.hostname) {
      return event.host.hostname;
    }
    // Проверяем поле source как fallback
    if (event.source && typeof event.source === 'string') {
      return event.source;
    }
    // Проверяем поле agent как еще один fallback
    if (event.agent && typeof event.agent === 'string') {
      return event.agent;
    }
    return 'Unknown Host';
  };

  // Event handlers
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это событие?')) return;
    
    try {
      await apiClient.deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event.event_id !== eventId));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Ошибка удаления события:', error);
      alert('Ошибка при удалении события');
    }
  };

  const handleBulkDelete = async (timeRange: string) => {
    let confirmMessage = '';
    let eventsToDelete: TelemetryEvent[] = [];
    const now = Date.now();
    
    switch (timeRange) {
      case '1h':
        confirmMessage = 'Вы уверены, что хотите удалить все события за последний час?';
        eventsToDelete = events.filter(event => {
          const eventTime = new Date(event.timestamp).getTime();
          return now - eventTime <= 60 * 60 * 1000;
        });
        break;
      case '24h':
        confirmMessage = 'Вы уверены, что хотите удалить все события за последние 24 часа?';
        eventsToDelete = events.filter(event => {
          const eventTime = new Date(event.timestamp).getTime();
          return now - eventTime <= 24 * 60 * 60 * 1000;
        });
        break;
      case '7d':
        confirmMessage = 'Вы уверены, что хотите удалить все события за последнюю неделю?';
        eventsToDelete = events.filter(event => {
          const eventTime = new Date(event.timestamp).getTime();
          return now - eventTime <= 7 * 24 * 60 * 60 * 1000;
        });
        break;
      case '30d':
        confirmMessage = 'Вы уверены, что хотите удалить все события за последний месяц?';
        eventsToDelete = events.filter(event => {
          const eventTime = new Date(event.timestamp).getTime();
          return now - eventTime <= 30 * 24 * 60 * 60 * 1000;
        });
        break;
      case 'all':
        confirmMessage = 'Вы уверены, что хотите удалить ВСЕ события? Это действие необратимо!';
        eventsToDelete = [...events];
        break;
      default:
        return;
    }

    if (eventsToDelete.length === 0) {
      alert(`Не найдено событий для удаления за указанный период.`);
      return;
    }

    confirmMessage += `\n\nБудет удалено событий: ${eventsToDelete.length}`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      // Показываем индикатор загрузки
      setLoading(true);
      
      // Удаляем события по одному (можно оптимизировать с batch API если есть)
      let deletedCount = 0;
      const errors: string[] = [];
      
      for (const event of eventsToDelete) {
        try {
          await apiClient.deleteEvent(event.event_id);
          deletedCount++;
        } catch (error) {
          console.error(`Ошибка удаления события ${event.event_id}:`, error);
          errors.push(event.event_id);
        }
      }
      
      // Обновляем локальное состояние, удаляя успешно удаленные события
      setEvents(prev => prev.filter(event => 
        !eventsToDelete.some(deleted => deleted.event_id === event.event_id) || 
        errors.includes(event.event_id)
      ));
      
      setShowBulkDelete(false);
      
      if (errors.length === 0) {
        alert(`Успешно удалено ${deletedCount} событий.`);
      } else {
        alert(`Удалено ${deletedCount} из ${eventsToDelete.length} событий. ${errors.length} событий не удалось удалить.`);
      }
      
    } catch (error) {
      console.error('Ошибка массового удаления:', error);
      alert('Произошла ошибка при массовом удалении событий');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        const newEvent: TelemetryEvent = {
          event_id: `imported_${Date.now()}`,
          timestamp: new Date().toISOString(),
          event_type: jsonData.event_type || 'imported',
          severity: jsonData.severity || 'medium',
          status: 'new',
          ...jsonData
        };
        
        if (jsonData.source_host && !jsonData.host) {
          newEvent.host = {
            host_id: `host-${Date.now()}`,
            hostname: jsonData.source_host,
            domain: jsonData.domain || 'unknown'
          };
        }
        
        if (!newEvent.host && !newEvent.source) {
          newEvent.source = jsonData.source_host || jsonData.hostname || 'Imported Event';
        }
        
        setEvents(prev => [newEvent, ...prev]);
        setShowImport(false);
      } catch (error) {
        console.error('Import error:', error);
        alert('Неверный формат JSON файла');
      }
    };
    reader.readAsText(file);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      severity: 'all',
      eventType: 'all',
      timeFilter: '24h'
    });
    setCurrentPage(1);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Загрузка событий...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ошибка загрузки событий</h3>
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Повторить попытку
        </button>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">События безопасности</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Мониторинг и управление событиями системы безопасности
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновляется каждые 30 сек
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Импорт
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </button>
          <button
            onClick={() => setShowBulkDelete(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить все
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по ID, типу события, хосту..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Time Filter */}
          <div className="flex gap-2">
            {(['1h', '24h', '7d', '30d'] as TimeFilter[]).map((period) => (
              <button
                key={period}
                onClick={() => setFilters(prev => ({ ...prev, timeFilter: period }))}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  filters.timeFilter === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period === '1h' ? '1 час' : period === '24h' ? '24 часа' : period === '7d' ? '7 дней' : '30 дней'}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Все уровни</option>
              <option value="critical">Критический</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
              <option value="info">Информационный</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="relative">
            <select
              value={filters.eventType}
              onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Все типы событий</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(filters.search || filters.severity !== 'all' || filters.eventType !== 'all' || filters.timeFilter !== '24h') && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Results summary */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Показано {paginatedEvents.length} из {filteredEvents.length} событий
            {filteredEvents.length !== events.length && ` (всего ${events.length})`}
          </span>
          <div className="flex items-center gap-4">
            <span>Вид:</span>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              Таблица
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 rounded ${viewMode === 'cards' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              Карточки
            </button>
          </div>
        </div>
      </div>

      {/* Events Display */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Событий не найдено</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {events.length === 0 
              ? 'События будут отображаться здесь автоматически при их поступлении'
              : 'Попробуйте изменить фильтры или период времени'
            }
          </p>
          {filteredEvents.length !== events.length && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Критичность
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID события
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedEvents.map((event, index) => {
                  const timeFormatted = formatTime(event.timestamp);
                  return (
                    <tr 
                      key={event.event_id || index} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div>
                          <div className="font-medium">{timeFormatted.date}</div>
                          <div className="text-gray-500 dark:text-gray-400">{timeFormatted.time}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <Server className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                          <span className="truncate">{getHostName(event)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="truncate">{event.event_type || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(event.severity || 'info')}`}>
                          {getSeverityIcon(event.severity || 'info')}
                          <span className="ml-1">{getSeverityLabel(event.severity || 'info')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        <span className="truncate">
                          {event.event_id ? event.event_id.substring(0, 12) + '...' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.event_id);
                            }}
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
      ) : (
        /* Cards View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedEvents.map((event, index) => {
            const timeFormatted = formatTime(event.timestamp);
            return (
              <div
                key={event.event_id || index}
                onClick={() => setSelectedEvent(event)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.severity || 'info')}`}>
                    {getSeverityIcon(event.severity || 'info')}
                    <span className="ml-1">{getSeverityLabel(event.severity || 'info')}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>{timeFormatted.date}</div>
                    <div>{timeFormatted.time}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {event.event_type || 'Unknown Event'}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Server className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{getHostName(event)}</span>
                  </div>
                  
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                    ID: {event.event_id || 'N/A'}
                  </div>
                  
                  {event.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {event.description}
                    </div>
                  )}
                </div>
                
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                    }}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event.event_id);
                    }}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Предыдущая
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Следующая
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Показано{' '}
                <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                {' '}-{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredEvents.length)}
                </span>
                {' '}из{' '}
                <span className="font-medium">{filteredEvents.length}</span>
                {' '}результатов
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Предыдущая
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Следующая
                </button>
              </nav>
            </div>
          </div>
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

      {/* Bulk Delete Modal */}
      {showBulkDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Массовое удаление событий</h3>
              <button
                onClick={() => setShowBulkDelete(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Выберите период для удаления событий:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleBulkDelete('1h')}
                  className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Последний час</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {events.filter(e => Date.now() - new Date(e.timestamp).getTime() <= 60 * 60 * 1000).length} событий
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleBulkDelete('24h')}
                  className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Последние 24 часа</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {events.filter(e => Date.now() - new Date(e.timestamp).getTime() <= 24 * 60 * 60 * 1000).length} событий
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleBulkDelete('7d')}
                  className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Последняя неделя</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {events.filter(e => Date.now() - new Date(e.timestamp).getTime() <= 7 * 24 * 60 * 60 * 1000).length} событий
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleBulkDelete('30d')}
                  className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 dark:text-white">Последний месяц</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {events.filter(e => Date.now() - new Date(e.timestamp).getTime() <= 30 * 24 * 60 * 60 * 1000).length} событий
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => handleBulkDelete('all')}
                  className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg transition-colors border border-red-200 dark:border-red-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-red-900 dark:text-red-100 font-medium">Все события</span>
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {events.length} событий
                    </span>
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Необратимое действие!
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Детали события</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(selectedEvent, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `event_${selectedEvent.event_id}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    Экспорт
                  </button>
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
            </div>
            
            <div className="p-6 space-y-6">
              {/* Key Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID события
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {selectedEvent.event_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Хост источник
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {getHostName(selectedEvent)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Тип события
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {selectedEvent.event_type}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Время
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {formatTime(selectedEvent.timestamp).date} {formatTime(selectedEvent.timestamp).time}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Критичность
                  </label>
                  <div className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-sm font-medium border ${getSeverityColor(selectedEvent.severity || 'info')}`}>
                    {getSeverityIcon(selectedEvent.severity || 'info')}
                    <span className="ml-1">{getSeverityLabel(selectedEvent.severity || 'info')}</span>
                  </div>
                </div>
                {selectedEvent.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Описание
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Formatted Details */}
              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Детали события
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    {Object.entries(selectedEvent.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0 mr-4">
                          {key}:
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white text-right">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Raw JSON Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Полные данные события (JSON)
                </label>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                    {JSON.stringify(selectedEvent, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
