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
  AlertCircle,
  Download,
  Info
} from 'lucide-react';
import { SecurityStatus, SecurityStatusType } from '../types/hostTypes';

interface SecurityStatusCardProps {
  moduleId: string;
  status: SecurityStatus;
  onRefresh: (moduleId: string) => void;
  isRefreshing?: boolean;
  className?: string;
}

export const SecurityStatusCard: React.FC<SecurityStatusCardProps> = ({
  moduleId,
  status,
  onRefresh,
  isRefreshing = false,
  className = ''
}) => {
  const getStatusConfig = (statusType: SecurityStatusType) => {
    switch (statusType) {
      case 'enabled':
        return {
          color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50',
          textColor: 'text-green-800 dark:text-green-200',
          icon: <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" aria-hidden="true" />,
          label: 'Включено',
          badgeColor: 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300',
          headerColor: 'text-green-900 dark:text-green-100',
          accentColor: 'bg-green-500'
        };
      case 'disabled':
        return {
          color: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50',
          textColor: 'text-red-800 dark:text-red-200',
          icon: <XCircle className="h-6 w-6 text-red-500 dark:text-red-400" aria-hidden="true" />,
          label: 'Отключено',
          badgeColor: 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300',
          headerColor: 'text-red-900 dark:text-red-100',
          accentColor: 'bg-red-500'
        };
      case 'access_denied':
        return {
          color: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          icon: <Lock className="h-6 w-6 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />,
          label: 'Доступ запрещён',
          badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300',
          headerColor: 'text-yellow-900 dark:text-yellow-100',
          accentColor: 'bg-yellow-500'
        };
      case 'no_data':
        return {
          color: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
          textColor: 'text-gray-700 dark:text-gray-300',
          icon: <HelpCircle className="h-6 w-6 text-gray-500 dark:text-gray-400" aria-hidden="true" />,
          label: 'Нет данных',
          badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          headerColor: 'text-gray-800 dark:text-gray-200',
          accentColor: 'bg-gray-500'
        };
      default: // 'unknown'
        return {
          color: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50',
          textColor: 'text-purple-800 dark:text-purple-200',
          icon: <AlertTriangle className="h-6 w-6 text-purple-500 dark:text-purple-400" aria-hidden="true" />,
          label: 'Неизвестно',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300',
          headerColor: 'text-purple-900 dark:text-purple-100',
          accentColor: 'bg-purple-500'
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
      <div 
        className={`bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-soft ${className}`}
        role="alert"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-gray-500" aria-hidden="true" />
          <span className="text-base font-medium text-gray-600 dark:text-gray-400">
            Ошибка загрузки данных
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          Не удалось получить информацию о модуле безопасности
        </p>
        <button
          onClick={() => onRefresh(moduleId)}
          className="btn-secondary text-sm focus-enhanced"
          aria-label={`Повторить загрузку данных для модуля ${moduleId}`}
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Попробовать снова
        </button>
      </div>
    );
  }

  const config = getStatusConfig(status.status);

  return (
    <div 
      className={`border rounded-2xl p-6 transition-all duration-300 hover:shadow-medium dark:hover:shadow-lg/10 relative overflow-hidden ${config.color} ${className}`}
      role="article"
      aria-labelledby={`module-${moduleId}-title`}
    >
      {/* Status accent bar */}
      <div className={`absolute top-0 left-0 w-full h-1 ${config.accentColor}`}></div>
      
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/80 dark:bg-gray-800/80 rounded-xl flex items-center justify-center shadow-sm">
            {moduleId === 'windowsUpdate' ? (
              <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            ) : (
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1">
            <h3 
              id={`module-${moduleId}-title`}
              className={`font-bold text-lg leading-tight ${config.headerColor}`}
            >
              {status.displayName || 'Неизвестный модуль'}
            </h3>
          </div>
        </div>
        <button
          onClick={() => onRefresh(moduleId)}
          disabled={isRefreshing}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-200 focus-enhanced"
          aria-label={`Обновить данные для ${status.displayName || moduleId}`}
          title="Обновить данные"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Enhanced Status Display */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-shrink-0">
          {config.icon}
        </div>
        <div className="flex-1">
          <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold ${config.badgeColor} shadow-sm`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Enhanced Description */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {status.description || 'Описание недоступно для данного модуля безопасности'}
        </p>
      </div>

      {/* Enhanced Details Section */}
      {status.details && Object.keys(status.details).length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Детали конфигурации
            </h4>
          </div>
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            {Object.entries(status.details).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize font-medium">
                  {key.replace(/_/g, ' ')}:
                </span>
                <span className={`text-sm font-semibold text-right ml-3 max-w-[60%] ${config.textColor}`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Recommendations */}
      {status.recommendations && status.recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Рекомендации по безопасности:
          </h4>
          <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4">
            <ul className="space-y-2">
              {status.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${config.accentColor}`}></div>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Enhanced Footer */}
      <div className="pt-4 border-t border-gray-200/60 dark:border-gray-600/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="font-medium">Источник: {status.source || 'Неизвестно'}</span>
          </div>
          <div 
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400" 
            title={`Последнее обновление: ${formatTimestamp(status.lastUpdated)}`}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span className="font-medium">{formatTimestamp(status.lastUpdated)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
