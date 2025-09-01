import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, MessageSquare, Clock, FileText, Activity } from 'lucide-react';
import { LoadingSpinner, SkeletonCard, ProgressBar, SkeletonText } from '../components/LoadingStates';
import { FadeIn, SlideIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { Card } from '../components/ui/Card';
import { DashboardAnalytics } from '../components/DashboardAnalytics';
import { useConnectivity } from '../utils/connectivity';
import { ConnectivityIndicator } from '../components/ConnectivityIndicator';

const AnalyticsPage: React.FC = () => {
  const { isOnline, isApiAvailable } = useConnectivity();
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading analytics data
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsLoading(false);
          clearInterval(timer);
          return 100;
        }
        return prev + 8;
      });
    }, 120);

    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <SkeletonText width="200px" height="32px" className="mb-2" />
            <SkeletonText width="300px" height="20px" />
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-center mb-4">
              <LoadingSpinner size="lg" />
            </div>
            <ProgressBar progress={progress} className="mb-4" />
            <p className="text-center text-gray-600">Carregando dados de analytics...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(2)].map((_, i) => (
              <SkeletonCard key={i} height="300px" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total de Conversas',
      value: '1,234',
      change: '+12%',
      trend: 'up',
      icon: MessageSquare,
      color: 'blue'
    },
    {
      title: 'Documentos Processados',
      value: '856',
      change: '+8%',
      trend: 'up',
      icon: FileText,
      color: 'green'
    },
    {
      title: 'Usuários Ativos',
      value: '342',
      change: '+15%',
      trend: 'up',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Taxa de Sucesso',
      value: '98.5%',
      change: '+2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20',
      green: 'from-green-500 to-green-600 text-green-600 bg-green-50 dark:bg-green-900/20',
      purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20',
      orange: 'from-orange-500 to-orange-600 text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <FadeIn>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <SlideIn direction="down">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Analytics
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Métricas e insights em tempo real
                    </p>
                  </div>
                </div>
                <ConnectivityIndicator position="static" showDetails={true} />
              </div>
            </div>
          </div>
        </SlideIn>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <StaggerContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                const colorClasses = getColorClasses(stat.color);
                
                return (
                  <StaggerItem key={index}>
                    <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses.split(' ')[0]} ${colorClasses.split(' ')[1]} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    stat.trend === 'up' 
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <TrendingUp className={`h-3 w-3 ${
                      stat.trend === 'up' ? '' : 'rotate-180'
                    }`} />
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {stat.title}
                  </p>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>

          {/* Dashboard Analytics */}
          <SlideIn direction="up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Dashboard */}
              <div className="lg:col-span-2">
                <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Dashboard Principal
                    </h2>
                    <div className={`flex items-center space-x-2 ${
                      isOnline && isApiAvailable 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      <Activity className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {isOnline && isApiAvailable ? 'Dados em Tempo Real' : 'Dados Offline'}
                      </span>
                    </div>
                  </div>
                  <DashboardAnalytics />
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Recent Activity */}
                <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Atividade Recente
                  </h3>
                  <div className="space-y-4">
                    {[
                      { action: 'Nova conversa iniciada', time: '2 min atrás', type: 'chat' },
                      { action: 'Documento processado', time: '5 min atrás', type: 'document' },
                      { action: 'Usuário conectado', time: '8 min atrás', type: 'user' },
                      { action: 'Análise concluída', time: '12 min atrás', type: 'analysis' }
                    ].map((activity, index) => {
                      const getActivityIcon = (type: string) => {
                        switch (type) {
                          case 'chat': return MessageSquare;
                          case 'document': return FileText;
                          case 'user': return Users;
                          case 'analysis': return BarChart3;
                          default: return Activity;
                        }
                      };
                      
                      const ActivityIcon = getActivityIcon(activity.type);
                      
                      return (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                            <ActivityIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {activity.action}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* System Health */}
                <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Saúde do Sistema
                  </h3>
                  <div className="space-y-4">
                    {[
                      { metric: 'CPU', value: '45%', status: 'good' },
                      { metric: 'Memória', value: '62%', status: 'warning' },
                      { metric: 'Disco', value: '78%', status: 'warning' },
                      { metric: 'Rede', value: '12ms', status: 'good' }
                    ].map((health, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {health.metric}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {health.value}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            health.status === 'good' 
                              ? 'bg-green-500' 
                              : health.status === 'warning'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </SlideIn>
        </div>
      </div>
    </FadeIn>
  );
};

export default AnalyticsPage;