import React, { useState } from 'react';
import { HostsSidebar } from './HostsSidebar';
import { HostSummaryCard } from './HostSummaryCard';
import { ProcessesTable } from './ProcessesTable';
import { AutorunsTable } from './AutorunsTable';
import { SecurityAccordion } from './security/SecurityAccordion';
import { FindingsTable } from './FindingsTable';
import { RawJsonModal } from './RawJsonModal';
import { 
  Activity,
  Cpu,
  FolderOpen,
  Shield,
  AlertTriangle,
  FileText,
  Database
} from 'lucide-react';

interface HostDashboardProps {
  className?: string;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ className = '' }) => {
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'processes' | 'autoruns' | 'security' | 'findings' | 'raw'>('overview');
  const [showRawJson, setShowRawJson] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Обзор', icon: Activity },
    { id: 'processes', name: 'Процессы', icon: Cpu },
    { id: 'autoruns', name: 'Автозапуск', icon: FolderOpen },
    { id: 'security', name: 'Безопасность', icon: Shield },
    { id: 'findings', name: 'Рекомендации', icon: AlertTriangle },
    { id: 'raw', name: 'Raw JSON', icon: Database }
  ];

  const renderTabContent = () => {
    if (!selectedHostId) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Выберите хост для просмотра
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Выберите хост из списка слева для просмотра детальной информации
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <HostSummaryCard hostId={selectedHostId} />;
      case 'processes':
        return <ProcessesTable hostId={selectedHostId} />;
      case 'autoruns':
        return <AutorunsTable hostId={selectedHostId} />;
      case 'security':
        return <SecurityAccordion hostId={selectedHostId} />;
      case 'findings':
        return <FindingsTable hostId={selectedHostId} />;
      case 'raw':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Просмотр Raw JSON
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Просмотрите необработанные данные от агента в формате JSON
              </p>
              <button
                onClick={() => setShowRawJson(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Открыть Raw JSON
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 ${className}`}>
      {/* Левый сайдбар с хостами */}
      <div className="w-80 flex-shrink-0">
        <HostsSidebar
          selectedHostId={selectedHostId}
          onHostSelect={setSelectedHostId}
          className="h-full"
        />
      </div>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Вкладки */}
        {selectedHostId && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="px-6">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center transition-colors duration-200`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Контент вкладки */}
        <div className="flex-1 overflow-auto p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Модальное окно Raw JSON */}
      {showRawJson && selectedHostId && (
        <RawJsonModal
          hostId={selectedHostId}
          onClose={() => setShowRawJson(false)}
        />
      )}
    </div>
  );
};
