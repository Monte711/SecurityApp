import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Filter, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  Settings,
  Loader2
} from 'lucide-react';
import { SecurityItemData, SecurityAccordionFilters } from '../../types/securityAccordion';
import { SecurityItem } from './SecurityItem';
import { SecurityFilters } from './SecurityFilters';
import { securityAccordionNormalizer } from '../../api/securityAccordionNormalizer';
import { securityDataNormalizer } from '../../api/securityNormalizer';

interface SecurityAccordionProps {
  hostId: string;
  className?: string;
}

export const SecurityAccordion: React.FC<SecurityAccordionProps> = ({
  hostId,
  className = ''
}) => {
  const [items, setItems] = useState<SecurityItemData[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Фильтры с сохранением в localStorage
  const [filters, setFilters] = useState<SecurityAccordionFilters>(() => {
    const saved = localStorage.getItem('security-accordion-filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved filters:', e);
      }
    }
    return {
      search: '',
      statusFilter: 'all',
      severityFilter: 'all',
      sortBy: 'severity',
      sortOrder: 'asc'
    };
  });

  // Сохранение фильтров в localStorage
  useEffect(() => {
    localStorage.setItem('security-accordion-filters', JSON.stringify(filters));
  }, [filters]);

  // Загрузка данных
  const loadSecurityData = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
      }
      setError(null);
      
      // Получаем нормализованные данные через существующий API
      const normalizedData = await securityDataNormalizer.getNormalizedHostSecurity(hostId);
      
      // Преобразуем в формат для accordion
      const accordionItems = securityAccordionNormalizer ? 
        securityAccordionNormalizer.normalizeSecurityData(normalizedData) : [];
      
      // Сортируем по умолчанию
      const sortedItems = securityAccordionNormalizer ? 
        securityAccordionNormalizer.sortItemsDefault(accordionItems) : accordionItems;
      
      setItems(sortedItems);
      setLastUpdated(new Date().toISOString());
      
      console.log('SecurityAccordion: Loaded items:', sortedItems.length);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные безопасности');
      console.error('SecurityAccordion: Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  // Обновление отдельного элемента
  const refreshItem = useCallback(async (itemId: string) => {
    setRefreshingItems(prev => new Set(prev).add(itemId));
    
    try {
      // Симулируем запрос обновления конкретного модуля
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Перезагружаем все данные (в реальном API можно было бы обновить только конкретный модуль)
      await loadSecurityData(false);
      
      console.log(`SecurityAccordion: Refreshed item ${itemId}`);
      
    } catch (err) {
      console.error(`SecurityAccordion: Failed to refresh item ${itemId}:`, err);
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [loadSecurityData]);

  // Начальная загрузка
  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  // Фильтрация элементов
  const filteredItems = useMemo(() => {
    if (!securityAccordionNormalizer) {
      return items || [];
    }
    return securityAccordionNormalizer.filterItems(items, filters);
  }, [items, filters]);

  // Переключение развернутого состояния
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Статистика проблем
  const problemStats = useMemo(() => {
    const critical = items.filter(item => item.severity === 'critical').length;
    const high = items.filter(item => item.severity === 'high').length;
    const disabled = items.filter(item => item.status === 'disabled').length;
    const noData = items.filter(item => item.status === 'no_data' || item.status === 'denied').length;
    
    return { critical, high, disabled, noData };
  }, [items]);

  if (loading) {
    return (
      <div 
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 p-8 ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-6" aria-hidden="true" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Загрузка параметров безопасности
          </h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Анализируем состояние безопасности системы...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`bg-red-50 dark:bg-red-900/10 rounded-2xl shadow-soft border border-red-200 dark:border-red-800/50 p-8 ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" aria-hidden="true" />
          <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-3">
            Ошибка загрузки данных
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-6 leading-relaxed max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={() => loadSecurityData()}
            className="btn-danger focus-enhanced"
            aria-label="Повторить загрузку данных безопасности"
          >
            <RefreshCw className="w-5 h-5 mr-2" aria-hidden="true" />
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} role="main" aria-label="Параметры безопасности">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800/50 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Параметры безопасности
            </h1>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Детальный анализ настроек безопасности системы с возможностью индивидуального обновления
            </p>
            
            {/* Problem Summary */}
            {(problemStats.critical > 0 || problemStats.high > 0 || problemStats.disabled > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {problemStats.critical > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4 mr-1" aria-hidden="true" />
                    {problemStats.critical} критичных
                  </span>
                )}
                {problemStats.high > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
                    {problemStats.high} высокий приоритет
                  </span>
                )}
                {problemStats.disabled > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                    {problemStats.disabled} отключено
                  </span>
                )}
              </div>
            )}
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>Найдено {items.length} параметров • Последнее обновление: {new Date(lastUpdated).toLocaleString('ru-RU')}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary focus-enhanced ${showFilters ? 'bg-gray-700 dark:bg-gray-600' : ''}`}
              aria-label="Показать фильтры"
              aria-expanded={showFilters}
            >
              <Filter className="w-5 h-5 mr-2" aria-hidden="true" />
              Фильтры
              {showFilters ? (
                <ChevronUp className="w-4 h-4 ml-2" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" aria-hidden="true" />
              )}
            </button>
            
            <button
              onClick={() => loadSecurityData()}
              disabled={loading}
              className="btn-primary focus-enhanced min-w-[160px]"
              aria-label="Обновить все параметры безопасности"
            >
              <RefreshCw 
                className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} 
                aria-hidden="true" 
              />
              Обновить все
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <SecurityFilters
          filters={filters}
          onFiltersChange={setFilters}
          itemsCount={items.length}
          filteredCount={filteredItems.length}
          onReset={() => setFilters({
            search: '',
            statusFilter: 'all',
            severityFilter: 'all',
            sortBy: 'severity',
            sortOrder: 'asc'
          })}
        />
      )}

      {/* Security Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Нет параметров для отображения
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Попробуйте изменить фильтры или очистить поиск
          </p>
        </div>
      ) : (
        <div 
          className="space-y-3"
          role="list"
          aria-label={`Список параметров безопасности: ${filteredItems.length} элементов`}
        >
          {filteredItems.map((item: SecurityItemData) => (
            <SecurityItem
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              isRefreshing={refreshingItems.has(item.id)}
              onToggleExpand={() => toggleExpanded(item.id)}
              onRefresh={() => refreshItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
