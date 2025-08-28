import React from 'react';
import { 
  Search, 
  X, 
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { SecurityAccordionFilters } from '../../types/securityAccordion';

interface SecurityFiltersProps {
  filters: SecurityAccordionFilters;
  onFiltersChange: (filters: SecurityAccordionFilters) => void;
  itemsCount: number;
  filteredCount: number;
  onReset: () => void;
}

export const SecurityFilters: React.FC<SecurityFiltersProps> = ({
  filters,
  onFiltersChange,
  itemsCount,
  filteredCount,
  onReset
}) => {
  const updateFilter = (key: keyof SecurityAccordionFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = 
    filters.search.trim() !== '' ||
    filters.statusFilter !== 'all' ||
    filters.severityFilter !== 'all' ||
    filters.sortBy !== 'severity' ||
    filters.sortOrder !== 'asc';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Фильтры и поиск
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Показано {filteredCount} из {itemsCount}
          </span>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              aria-label="Сбросить все фильтры"
            >
              <RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />
              Сбросить
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label htmlFor="security-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Поиск по названию
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              id="security-search"
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Введите название параметра..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            />
            {filters.search && (
              <button
                onClick={() => updateFilter('search', '')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Очистить поиск"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Статус
          </label>
          <div className="relative">
            <select
              id="status-filter"
              value={filters.statusFilter}
              onChange={(e) => updateFilter('statusFilter', e.target.value)}
              className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10 transition-colors"
            >
              <option value="all">Все статусы</option>
              <option value="problems_only">Только проблемы</option>
              <option value="no_data_only">Нет данных</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* Severity Filter */}
        <div>
          <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Приоритет
          </label>
          <div className="relative">
            <select
              id="severity-filter"
              value={filters.severityFilter}
              onChange={(e) => updateFilter('severityFilter', e.target.value)}
              className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10 transition-colors"
            >
              <option value="all">Все приоритеты</option>
              <option value="critical">Критичный</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
              <option value="none">Нет</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сортировать по
            </label>
            <div className="relative">
              <select
                id="sort-by"
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10 transition-colors"
              >
                <option value="severity">Приоритету</option>
                <option value="last_seen">Времени обновления</option>
                <option value="name">Названию</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          <div className="flex-1">
            <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Порядок
            </label>
            <div className="relative">
              <select
                id="sort-order"
                value={filters.sortOrder}
                onChange={(e) => updateFilter('sortOrder', e.target.value)}
                className="w-full appearance-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10 transition-colors"
              >
                <option value="asc">По возрастанию</option>
                <option value="desc">По убыванию</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
