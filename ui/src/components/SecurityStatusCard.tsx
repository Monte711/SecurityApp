import React from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  HelpCircle,
  Lock,
  RefreshCw,
  Clock,
  AlertCircle
} from 'lucide-react';
import { SecurityStatus, SecurityStatusType } from '../types/hostTypes';

interface SecurityStatusCardProps {
  moduleId: string;
  status: SecurityStatus;
  onRefresh: (moduleId: string) => void;
  isRefreshing?: boolean;
}

export const SecurityStatusCard: React.FC<SecurityStatusCardProps> = ({
  moduleId,
  status,
  onRefresh,
  isRefreshing = false
}) => {
  const getStatusConfig = (statusType: SecurityStatusType) => {
    switch (statusType) {
      case 'enabled':
        return {
          color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50',
          textColor: 'text-green-800 dark:text-green-200',
          icon: <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />,
          label: 'Включено',
          badgeColor: 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300',
          headerColor: 'text-green-900 dark:text-green-100'
        };
      case 'disabled':
        return {
          color: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50',
          textColor: 'text-red-800 dark:text-red-200',
          icon: <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />,
          label: 'Отключено',
          badgeColor: 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300',
          headerColor: 'text-red-900 dark:text-red-100'
        };
      case 'access_denied':
        return {
          color: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          icon: <Lock className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
          label: 'Доступ запрещён',
          badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300',
          headerColor: 'text-yellow-900 dark:text-yellow-100'
        };
      case 'no_data':
        return {
          color: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
          textColor: 'text-gray-700 dark:text-gray-300',
          icon: <HelpCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />,
          label: 'Нет данных',
          badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          headerColor: 'text-gray-800 dark:text-gray-200'
        };
      default: // 'unknown'
        return {
          color: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50',
          textColor: 'text-purple-800 dark:text-purple-200',
          icon: <AlertTriangle className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
          label: 'Неизвестно',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300',
          headerColor: 'text-purple-900 dark:text-purple-100'
        };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неизвестно';
    }
  };

  // Defensive rendering - ensure we have valid status
  if (!status || typeof status !== 'object') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Ошибка загрузки данных</span>
        </div>
        <button
          onClick={() => onRefresh(moduleId)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const config = getStatusConfig(status.status);

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md dark:hover:shadow-lg/10 ${config.color}`}>
      {/* Заголовок с кнопкой обновления */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className={`font-semibold text-sm ${config.headerColor}`}>
            {status.displayName || 'Неизвестный модуль'}
          </h3>
        </div>
        <button
          onClick={() => onRefresh(moduleId)}
          disabled={isRefreshing}
          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          title="Обновить сейчас"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Статус с иконкой */}
      <div className="flex items-center gap-3 mb-3">
        {config.icon}
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.badgeColor}`}>
          {config.label}
        </span>
      </div>

      {/* Описание */}
      <div className="mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {status.description || 'Описание недоступно'}
        </p>
      </div>

      {/* Детали статуса */}
      {status.details && Object.keys(status.details).length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Детали:</h4>
          <div className="space-y-1.5">
            {Object.entries(status.details).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start text-xs">
                <span className="text-gray-600 dark:text-gray-400 capitalize">{key}:</span>
                <span className={`${config.textColor} font-medium text-right ml-2 max-w-[60%]`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рекомендации */}
      {status.recommendations && status.recommendations.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Рекомендации:</h4>
          <ul className="space-y-1.5">
            {status.recommendations.map((rec, index) => (
              <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className={`${config.textColor} mt-0.5 text-[10px]`}>•</span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Метаинформация */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <span>Источник: {status.source || 'Неизвестно'}</span>
          </div>
          <div 
            className="flex items-center gap-1 text-gray-500 dark:text-gray-400" 
            title={`Последнее обновление: ${formatTimestamp(status.lastUpdated)}`}
          >
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(status.lastUpdated)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
