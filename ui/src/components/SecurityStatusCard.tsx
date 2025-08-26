import React from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  HelpCircle,
  Lock,
  RefreshCw,
  Clock
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
          color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          textColor: 'text-green-800 dark:text-green-200',
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          label: 'Включено',
          badgeColor: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
        };
      case 'disabled':
        return {
          color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          label: 'Отключено',
          badgeColor: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
        };
      case 'access_denied':
        return {
          color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          icon: <Lock className="h-5 w-5 text-yellow-500" />,
          label: 'Доступ запрещён',
          badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
        };
      case 'no_data':
        return {
          color: 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700',
          textColor: 'text-gray-800 dark:text-gray-200',
          icon: <HelpCircle className="h-5 w-5 text-gray-500" />,
          label: 'Нет данных',
          badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
        };
      default: // 'unknown'
        return {
          color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
          textColor: 'text-purple-800 dark:text-purple-200',
          icon: <AlertTriangle className="h-5 w-5 text-purple-500" />,
          label: 'Неизвестно',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
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

  const config = getStatusConfig(status.status);

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${config.color}`}>
      {/* Заголовок с кнопкой обновления */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className={`font-semibold ${config.textColor}`}>
            {status.displayName}
          </h3>
        </div>
        <button
          onClick={() => onRefresh(moduleId)}
          disabled={isRefreshing}
          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Обновить сейчас"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Статус с иконкой */}
      <div className="flex items-center gap-2 mb-2">
        {config.icon}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badgeColor}`}>
          {config.label}
        </span>
      </div>

      {/* Описание */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {status.description}
      </p>

      {/* Детали статуса */}
      {Object.keys(status.details).length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Детали:</h4>
          <div className="space-y-1">
            {Object.entries(status.details).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                <span className={config.textColor}>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рекомендации */}
      {status.recommendations.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Рекомендации:</h4>
          <ul className="space-y-1">
            {status.recommendations.map((rec, index) => (
              <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Метаинформация */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <span>Источник: {status.source}</span>
          </div>
          <div className="flex items-center gap-1" title={`Последнее обновление: ${formatTimestamp(status.lastUpdated)}`}>
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(status.lastUpdated)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
