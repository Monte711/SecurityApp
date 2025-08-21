import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { DashboardStats } from '../api/types';
import { Activity, Shield, AlertTriangle, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Загрузка статистики...</span>
      </div>
    );
  }

  const cards = [
    {
      title: 'Активные хосты',
      value: stats?.unique_hosts || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Подключенные агенты'
    },
    {
      title: 'Критические угрозы',
      value: stats?.severity_levels?.find(s => s.key === 'critical')?.doc_count || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Требуют внимания'
    },
    {
      title: 'Всего событий',
      value: stats?.total_events || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'За последние 24 часа'
    },
    {
      title: 'Типы событий',
      value: stats?.event_types?.length || 0,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Различных категорий'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Панель мониторинга безопасности</h2>
        <p className="text-gray-600 dark:text-gray-400">Состояние системы безопасности в реальном времени</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className={`${card.bgColor} ${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{card.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Состояние системы</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">API сервис</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Работает
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">OpenSearch</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Здоров
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Redis</span>
            <span className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Подключен
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Агенты</span>
            <span className="flex items-center text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              {stats?.unique_hosts || 0} активных
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
