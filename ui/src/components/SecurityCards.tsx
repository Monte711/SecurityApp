import { useState, useEffect } from "react";
import { NormalizedSecurityData } from "../types/hostTypes";
import { securityDataNormalizer } from "../api/securityNormalizer";
import { SecurityStatusCard } from "./SecurityStatusCard";
import { Loader2, RefreshCw, AlertTriangle, Shield, Info, CheckCircle, AlertCircle } from 'lucide-react';

interface SecurityCardsProps {
  hostId: string;
  className?: string;
}

export function SecurityCards({ hostId, className = '' }: SecurityCardsProps) {
  const [securityData, setSecurityData] = useState<NormalizedSecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingModules, setRefreshingModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSecurityData();
  }, [hostId]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await securityDataNormalizer.getNormalizedHostSecurity(hostId);
      setSecurityData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные безопасности');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleRefresh = async (moduleId: string) => {
    setRefreshingModules(prev => new Set(prev).add(moduleId));
    // Simulate module-specific refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshingModules(prev => {
      const newSet = new Set(prev);
      newSet.delete(moduleId);
      return newSet;
    });
    await loadSecurityData();
  };

  const getSecurityOverview = () => {
    if (!securityData) return null;
    
    const modules = [
      securityData.defender,
      securityData.firewall,
      securityData.uac,
      securityData.rdp,
      securityData.bitlocker,
      securityData.smb1,
      securityData.windowsUpdate
    ];
    
    const total = modules.length;
    const secure = modules.filter(m => m.status === 'enabled').length;
    const warning = modules.filter(m => m.status === 'disabled' || m.status === 'unknown').length;
    const critical = modules.filter(m => m.status === 'access_denied' || m.status === 'no_data').length;
    
    return { total, secure, warning, critical };
  };

  const overview = getSecurityOverview();

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
            Загрузка данных безопасности
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
            onClick={loadSecurityData}
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

  if (!securityData) {
    return (
      <div 
        className={`bg-gray-50 dark:bg-gray-800/50 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 p-8 ${className}`}
      >
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-6" aria-hidden="true" />
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-3">
            Нет данных о безопасности
          </h3>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-md mx-auto mb-6">
            Данные могут быть недоступны из-за ограничений доступа или проблем с подключением к агенту
          </p>
          <button
            onClick={loadSecurityData}
            className="btn-primary focus-enhanced"
            aria-label="Попробовать загрузить данные безопасности снова"
          >
            <RefreshCw className="w-5 h-5 mr-2" aria-hidden="true" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`} role="main" aria-label="Панель безопасности">
      {/* Enhanced Security Overview Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800/50 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Безопасность системы
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-4">
              Комплексный анализ параметров безопасности и рекомендации по защите
            </p>
            
            {/* Security Overview Stats */}
            {overview && (
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800/50">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                  <span className="text-green-800 dark:text-green-200 font-medium">
                    {overview.secure} защищено
                  </span>
                </div>
                {overview.warning > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
                    <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                      {overview.warning} требует внимания
                    </span>
                  </div>
                )}
                {overview.critical > 0 && (
                  <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800/50">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                    <span className="text-red-800 dark:text-red-200 font-medium">
                      {overview.critical} критично
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Info className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>Последнее обновление: {new Date(securityData.lastUpdated).toLocaleString('ru-RU')}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={loadSecurityData}
              disabled={loading}
              className="btn-primary focus-enhanced min-w-[160px]"
              aria-label="Обновить все данные безопасности"
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

      {/* Enhanced Security Modules Grid */}
      <div 
        className="grid gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
        role="grid"
        aria-label="Модули безопасности"
      >
        <SecurityStatusCard
          moduleId="defender"
          status={securityData.defender}
          isRefreshing={refreshingModules.has('defender')}
          onRefresh={() => handleModuleRefresh('defender')}
          className="card-hover"
        />
        
        <SecurityStatusCard
          moduleId="firewall"
          status={securityData.firewall}
          isRefreshing={refreshingModules.has('firewall')}
          onRefresh={() => handleModuleRefresh('firewall')}
          className="card-hover"
        />
        
        <SecurityStatusCard
          moduleId="uac"
          status={securityData.uac}
          isRefreshing={refreshingModules.has('uac')}
          onRefresh={() => handleModuleRefresh('uac')}
          className="card-hover"
        />
        
        <SecurityStatusCard
          moduleId="rdp"
          status={securityData.rdp}
          isRefreshing={refreshingModules.has('rdp')}
          onRefresh={() => handleModuleRefresh('rdp')}
          className="card-hover"
        />
        
        <SecurityStatusCard
          moduleId="bitlocker"
          status={securityData.bitlocker}
          isRefreshing={refreshingModules.has('bitlocker')}
          onRefresh={() => handleModuleRefresh('bitlocker')}
          className="card-hover"
        />
        
        <SecurityStatusCard
          moduleId="smb1"
          status={securityData.smb1}
          isRefreshing={refreshingModules.has('smb1')}
          onRefresh={() => handleModuleRefresh('smb1')}
          className="card-hover"
        />

        <SecurityStatusCard
          moduleId="windowsUpdate"
          status={securityData.windowsUpdate}
          isRefreshing={refreshingModules.has('windowsUpdate')}
          onRefresh={() => handleModuleRefresh('windowsUpdate')}
          className="card-hover"
        />
      </div>

      {/* Enhanced Security Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800/50 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4">
              Рекомендации по безопасности
            </h3>
            <div className="space-y-4 text-blue-800 dark:text-blue-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed">
                      Регулярно обновляйте операционную систему и установленное ПО
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed">
                      Используйте сильные пароли и многофакторную аутентификацию
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed">
                      Ограничьте права пользователей до минимально необходимых
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed">
                      Регулярно создавайте резервные копии важных данных
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed">
                      Мониторьте журналы событий на предмет подозрительной активности
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed">
                      Настройте автоматические уведомления о нарушениях безопасности
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
