import React from 'react';
import {
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

interface ChartDataPoint {
  time: string;
  messages: number;
  users: number;
  responseTime: number;
}

interface MetricsCardsProps {
  chartData: ChartDataPoint[];
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ chartData }) => {
  const totalMessages = chartData.reduce((sum, item) => sum + item.messages, 0);
  const totalUsers = chartData.reduce((sum, item) => sum + item.users, 0);
  const avgResponseTime = chartData.length > 0 
    ? Math.round(chartData.reduce((sum, item) => sum + item.responseTime, 0) / chartData.length)
    : 0;

  const metrics = [
    {
      title: 'Total de Mensagens',
      value: totalMessages.toLocaleString(),
      icon: MessageSquare,
      color: 'blue',
      trend: '+12%',
      progress: 75
    },
    {
      title: 'Usuários Ativos',
      value: Math.round(totalUsers / chartData.length || 0),
      icon: Users,
      color: 'green',
      trend: '+8%',
      progress: 60
    },
    {
      title: 'Tempo Médio',
      value: `${avgResponseTime}ms`,
      icon: Clock,
      color: 'yellow',
      trend: '-5%',
      progress: 45
    },
    {
      title: 'Taxa de Sucesso',
      value: '99.9%',
      icon: CheckCircle,
      color: 'purple',
      trend: '+15%',
      progress: 99
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        hover: 'group-hover:text-blue-800',
        progress: 'from-blue-500 to-blue-600',
        progressBg: 'bg-blue-100'
      },
      green: {
        gradient: 'from-green-500 to-green-600',
        bg: 'bg-green-50',
        text: 'text-green-700',
        hover: 'group-hover:text-green-800',
        progress: 'from-green-500 to-green-600',
        progressBg: 'bg-green-100'
      },
      yellow: {
        gradient: 'from-yellow-500 to-yellow-600',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        hover: 'group-hover:text-yellow-800',
        progress: 'from-yellow-500 to-yellow-600',
        progressBg: 'bg-yellow-100'
      },
      purple: {
        gradient: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        hover: 'group-hover:text-purple-800',
        progress: 'from-purple-500 to-purple-600',
        progressBg: 'bg-purple-100'
      }
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {metrics.map((metric, index) => {
        const colorClasses = getColorClasses(metric.color);
        const Icon = metric.icon;
        
        return (
          <div key={index} className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl hover:bg-white transition-all duration-500 transform hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 bg-gradient-to-r ${colorClasses.gradient} rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                <Icon className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 ${colorClasses.bg} rounded-full`}>
                <TrendingUp className={`w-3 h-3 ${colorClasses.text.replace('text-', 'text-').replace('-700', '-600')}`} />
                <span className={`text-xs font-semibold ${colorClasses.text}`}>{metric.trend}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className={`text-2xl sm:text-3xl font-bold text-gray-900 ${colorClasses.hover} transition-colors duration-300`}>
                {metric.value}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">{metric.title}</p>
              <div className={`w-full ${colorClasses.progressBg} rounded-full h-1.5 sm:h-2 mt-2 sm:mt-3`}>
                <div 
                  className={`bg-gradient-to-r ${colorClasses.progress} h-full rounded-full transition-all duration-1000 ease-out`} 
                  style={{ width: `${metric.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricsCards;