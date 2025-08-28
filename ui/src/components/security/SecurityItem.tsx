import React, { useState } from 'react';
import { 
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Shield,
  ShieldCheck,
  Monitor,
  Lock,
  Network,
  Download,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Copy
} from 'lucide-react';
import { SecurityItemData, SecurityItemStatus, SecurityItemSeverity } from '../../types/securityAccordion';
import { SecurityDetails } from './SecurityDetails';

interface SecurityItemProps {
  item: SecurityItemData;
  isExpanded: boolean;
  isRefreshing: boolean;
  onToggleExpand: () => void;
  onRefresh: () => void;
}

export const SecurityItem: React.FC<SecurityItemProps> = ({
  item,
  isExpanded,
  isRefreshing,
  onToggleExpand,
  onRefresh
}) => {
  const [showRawData, setShowRawData] = useState(false);

  // Получение конфигурации статуса
  const getStatusConfig = (status: SecurityItemStatus) => {
    switch (status) {
      case 'ok':
        return {
          color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50',
          badgeColor: 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300',
          icon: <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" aria-hidden="true" />,
          label: 'В норме',
          accentColor: 'bg-green-500'
        };
      case 'disabled':
        return {
          color: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50',
          badgeColor: 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300',
          icon: <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" aria-hidden="true" />,
          label: 'Отключено',
          accentColor: 'bg-red-500'
        };
      case 'no_data':
        return {
          color: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
          badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          icon: <HelpCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />,
          label: 'Нет данных',
          accentColor: 'bg-gray-500'
        };
      case 'denied':
        return {
          color: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50',
          badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300',
          icon: <Lock className="w-5 h-5 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />,
          label: 'Доступ запрещен',
          accentColor: 'bg-yellow-500'
        };
      default: // 'unknown'
        return {
          color: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300',
          icon: <AlertTriangle className="w-5 h-5 text-purple-500 dark:text-purple-400" aria-hidden="true" />,
          label: 'Неизвестно',
          accentColor: 'bg-purple-500'
        };
    }
  };

  // Получение конфигурации severity
  const getSeverityConfig = (severity: SecurityItemSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'bg-red-600',
          textColor: 'text-red-600 dark:text-red-400',
          label: 'Критично'
        };
      case 'high':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-600 dark:text-orange-400',
          label: 'Высокий'
        };
      case 'medium':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          label: 'Средний'
        };
      case 'low':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-600 dark:text-blue-400',
          label: 'Низкий'
        };
      default: // 'none'
        return {
          color: 'bg-gray-400',
          textColor: 'text-gray-500 dark:text-gray-400',
          label: 'Нет'
        };
    }
  };

  // Получение иконки по типу
  const getModuleIcon = (iconType: string = 'shield') => {
    const iconProps = { className: "w-5 h-5 text-gray-600 dark:text-gray-400", 'aria-hidden': true };
    
    switch (iconType) {
      case 'shield':
        return <Shield {...iconProps} />;
      case 'shield-check':
        return <ShieldCheck {...iconProps} />;
      case 'monitor':
        return <Monitor {...iconProps} />;
      case 'lock':
        return <Lock {...iconProps} />;
      case 'network':
        return <Network {...iconProps} />;
      case 'download':
        return <Download {...iconProps} />;
      case 'user-check':
        return <UserCheck {...iconProps} />;
      default:
        return <Shield {...iconProps} />;
    }
  };

  const statusConfig = getStatusConfig(item.status);
  const severityConfig = getSeverityConfig(item.severity);

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неизвестно';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Показать toast уведомление об успешном копировании
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className={`border rounded-xl transition-all duration-200 ${statusConfig.color} ${
        isExpanded ? 'shadow-md dark:shadow-lg/10' : 'shadow-sm hover:shadow-md dark:hover:shadow-lg/10'
      }`}
      role="listitem"
    >
      {/* Status accent bar */}
      <div className={`h-1 w-full ${statusConfig.accentColor} rounded-t-xl`}></div>
      
      {/* Header */}
      <div className="p-4">
        <div className="w-full flex items-center justify-between">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-4 flex-1 min-w-0 text-left group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
            aria-expanded={isExpanded}
            aria-controls={`security-details-${item.id}`}
            aria-describedby={`security-status-${item.id}`}
          >
            {/* Module Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center shadow-sm">
              {getModuleIcon(item.icon)}
            </div>
            
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {item.name}
                </h3>
                
                {/* Severity Indicator */}
                {item.severity !== 'none' && (
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${severityConfig.color}`}
                    title={`Приоритет: ${severityConfig.label}`}
                    aria-label={`Приоритет: ${severityConfig.label}`}
                  />
                )}
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                {/* Status Badge */}
                <span 
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusConfig.badgeColor}`}
                  id={`security-status-${item.id}`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                
                {/* Source and Time */}
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <span>{item.source}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{formatTimestamp(item.last_seen)}</span>
                </div>
              </div>
              
              {/* Description */}
              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          </button>
          
          {/* Right Side Controls */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Refresh Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Обновить данные"
              aria-label={`Обновить данные для ${item.name}`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            
            {/* Expand Arrow */}
            <button
              onClick={onToggleExpand}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div 
          id={`security-details-${item.id}`}
          className="border-t border-gray-200/60 dark:border-gray-600/60 animate-in slide-in-from-top-2 duration-200"
        >
          <SecurityDetails 
            item={item}
            onShowRawData={() => setShowRawData(true)}
            onCopyData={(data: any) => copyToClipboard(JSON.stringify(data, null, 2))}
          />
        </div>
      )}
      
      {/* Raw Data Modal */}
      {showRawData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowRawData(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Сырые данные: {item.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(item.raw_data, null, 2))}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Копировать JSON"
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setShowRawData(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Закрыть"
                >
                  <XCircle className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(80vh-120px)]">
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(item.raw_data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
