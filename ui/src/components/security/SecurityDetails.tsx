import React from 'react';
import {
  Info,
  Lightbulb,
  FileText,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { SecurityItemData } from '../../types/securityAccordion';

interface SecurityDetailsProps {
  item: SecurityItemData;
  onShowRawData: () => void;
  onCopyData: (data: any) => void;
}

export const SecurityDetails: React.FC<SecurityDetailsProps> = ({
  item,
  onShowRawData,
  onCopyData
}) => {
  // Проверка есть ли детали для отображения
  const hasDetails = item.details && Object.keys(item.details).length > 0;
  const hasRecommendations = item.recommendations && item.recommendations.length > 0;

  // Форматирование ключей для отображения
  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  };

  // Форматирование значений
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'Не указано';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Да' : 'Нет';
    }
    
    if (typeof value === 'object') {
      // Для объектов показываем только ключевую информацию, а не весь JSON
      if (Array.isArray(value)) {
        return `Массив (${value.length} элементов)`;
      }
      
      // Для простых объектов показываем краткое описание
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return 'Пустой объект';
      }
      
      // Если есть поле name или title, показываем его
      if (value.name) return String(value.name);
      if (value.title) return String(value.title);
      if (value.displayName) return String(value.displayName);
      
      // Иначе показываем количество свойств
      return `Объект (${keys.length} свойств)`;
    }
    
    return String(value);
  };

  // Определение является ли значение критичным
  const isValueCritical = (key: string, value: any): boolean => {
    const criticalKeywords = ['error', 'failed', 'disabled', 'отключ', 'ошибка', 'failed'];
    const keyLower = key.toLowerCase();
    const valueLower = String(value).toLowerCase();
    
    return criticalKeywords.some(keyword => 
      keyLower.includes(keyword) || valueLower.includes(keyword)
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* No Data State */}
      {(item.status === 'no_data' || item.status === 'denied') && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                {item.status === 'no_data' ? 'Данные недоступны' : 'Доступ запрещен'}
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                {item.status === 'no_data' 
                  ? 'Агент не смог получить информацию о данном параметре безопасности. Это может быть связано с системными ограничениями или недоступностью службы.'
                  : 'Недостаточно прав для получения информации о данном параметре. Запустите агент с правами администратора.'
                }
              </p>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                <p className="font-medium mb-1">Рекомендуемые действия:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Проверьте, запущен ли агент с правами администратора</li>
                  <li>Убедитесь, что соответствующая служба Windows активна</li>
                  <li>Проверьте журналы агента на наличие ошибок</li>
                  {item.status === 'denied' && (
                    <li>Проверьте политики безопасности и антивирусное ПО</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Section */}
      {hasDetails && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" aria-hidden="true" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Детали конфигурации
            </h4>
          </div>
          
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Special handling for firewall profiles */}
            {item.id === 'firewall' && item.details.profiles && Object.keys(item.details.profiles).length > 0 ? (
              <div className="p-4">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Профили брандмауэра ({item.details.enabled_profiles}/{item.details.total_profiles} активно):
                </h5>
                <div className="space-y-3">
                  {Object.entries(item.details.profiles).map(([profileKey, profile]: [string, any]) => (
                    <div key={profileKey} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {profile.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {profile.status === 'ok' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            profile.status === 'ok' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {profile.status === 'ok' ? 'Включен' : 'Выключен'}
                          </span>
                        </div>
                      </div>
                      {/* Показываем детали профиля */}
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {Object.entries(profile)
                          .filter(([key, value]) => {
                            // Исключаем служебные поля и сложные объекты
                            if (['name', 'status'].includes(key)) return false;
                            if (typeof value === 'object' && value !== null) return false;
                            if (typeof value === 'function') return false;
                            return true;
                          })
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">
                                {formatKey(key)}:
                              </span>
                              <span className="text-gray-900 dark:text-gray-100 font-mono">
                                {formatValue(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Показываем общие настройки брандмауэра если есть */}
                {Object.keys(item.details).some(key => !['profiles', 'enabled_profiles', 'total_profiles', 'profile_status_summary'].includes(key)) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h6 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Общие настройки:</h6>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {Object.entries(item.details)
                        .filter(([key]) => !['profiles', 'enabled_profiles', 'total_profiles', 'profile_status_summary'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {formatKey(key)}:
                            </span>
                            <span className="text-gray-900 dark:text-gray-100 font-mono">
                              {formatValue(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : 
            /* Special handling for volumes (BitLocker) */
            item.details.volumes && Array.isArray(item.details.volumes) ? (
              <div className="p-4">
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Диски:</h5>
                <div className="space-y-3">
                  {item.details.volumes.map((volume: any, index: number) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {Object.entries(volume).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {formatKey(key)}:
                            </span>
                            <span className={`text-right font-mono ${
                              isValueCritical(key, value)
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {formatValue(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(item.details)
                  .filter(([key]) => key !== 'volumes')
                  .map(([key, value]) => (
                    <div key={key} className="p-4 flex justify-between items-start gap-4">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-0 flex-1">
                        {formatKey(key)}:
                      </span>
                      <span className={`text-sm text-right font-mono min-w-0 flex-1 ${
                        isValueCritical(key, value)
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {formatValue(value)}
                      </span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {hasRecommendations && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Рекомендации по безопасности
            </h4>
          </div>
          
          <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800/50 p-4">
            <ul className="space-y-3">
              {item.recommendations!.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {recommendation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasDetails && !hasRecommendations && item.status !== 'no_data' && item.status !== 'denied' && (
        <div className="text-center py-8">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-500 dark:text-gray-400">
            Дополнительная информация о данном параметре не доступна
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onShowRawData}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
          Показать Raw JSON
        </button>
        
        <button
          onClick={() => onCopyData(item.details)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
          Копировать данные
        </button>
        
        {/* External documentation link placeholder */}
        <button
          onClick={() => {
            // TODO: Implement external documentation links
            window.open(`https://docs.microsoft.com/search/?terms=${encodeURIComponent(item.name)}`, '_blank');
          }}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
          Документация
        </button>
      </div>
    </div>
  );
};
