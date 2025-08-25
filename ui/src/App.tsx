import React from 'react';
import { HostDashboard } from './components/HostDashboard';
import { Dashboard } from './components/Dashboard';
import { AlertsTable } from './components/AlertsTable';
import { SimpleEventsList } from './components/SimpleEventsList';
import { ConfigPanel } from './components/ConfigPanel';
import { Settings, Bell, Home, Activity, Monitor, Shield } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('hosts');

  // Handler for API mode changes (used by ConfigPanel)
  const handleApiModeChange = (mode: 'mock' | 'real') => {
    // API mode is now managed entirely within ConfigPanel
    console.log('API mode changed to:', mode);
  };

  const navigation = [
    { id: 'hosts', name: 'Управление хостами', icon: Shield },
    { id: 'dashboard', name: 'Панель управления', icon: Home },
    { id: 'monitoring', name: 'Мониторинг', icon: Monitor },
    { id: 'events', name: 'События (расширенные)', icon: Bell },
    { id: 'analytics', name: 'Аналитика', icon: Activity },
    { id: 'settings', name: 'Настройки', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'hosts':
        return <HostDashboard />;
      case 'dashboard':
        return <Dashboard />;
      case 'monitoring':
        return <SimpleEventsList />;
      case 'events':
        return <AlertsTable />;
      case 'analytics':
        return (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Аналитика</h3>
            <p className="text-gray-500 dark:text-gray-400">Расширенная аналитика скоро появится...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Настройки платформы</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Конфигурация API и режимов работы системы
                </p>
              </div>
              

              
              <ConfigPanel onModeChange={handleApiModeChange} fullPage={true} />
            </div>
          </div>
        );
      default:
        return <HostDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Платформа Кибербезопасности</h1>
              </div>
            </div>
          </div>
          {/* Tabs row */}
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <div className="hidden sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`${
                      activeTab === item.id
                        ? 'border-blue-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    } whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm inline-flex items-center`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation */}
      <div className="sm:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`${
                  activeTab === item.id
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'
                } w-full text-left block pl-3 pr-4 py-2 border-l-4 text-base font-medium inline-flex items-center`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
