import React from 'react';
import {
  MessageSquare,
  Shield,
  Zap,
  Download,
  Settings,
  ChevronDown,
  Eye
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'message' | 'auth' | 'api' | 'export' | 'config';
  description: string;
  timestamp: string;
  user?: string;
  status?: 'success' | 'warning' | 'error';
}

interface ActivityLogProps {
  activities: Activity[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities }) => {
  const getActivityIcon = (type: Activity['type']) => {
    const iconMap = {
      message: MessageSquare,
      auth: Shield,
      api: Zap,
      export: Download,
      config: Settings
    };
    return iconMap[type];
  };

  const getActivityColor = (type: Activity['type'], status?: Activity['status']) => {
    if (status === 'error') return 'text-red-600 bg-red-50';
    if (status === 'warning') return 'text-yellow-600 bg-yellow-50';
    
    const colorMap = {
      message: 'text-blue-600 bg-blue-50',
      auth: 'text-green-600 bg-green-50',
      api: 'text-purple-600 bg-purple-50',
      export: 'text-orange-600 bg-orange-50',
      config: 'text-gray-600 bg-gray-50'
    };
    return colorMap[type];
  };

  const getStatusBadge = (status?: Activity['status']) => {
    if (!status) return null;
    
    const statusConfig = {
      success: { color: 'bg-green-100 text-green-800', text: 'Sucesso' },
      warning: { color: 'bg-yellow-100 text-yellow-800', text: 'Aviso' },
      error: { color: 'bg-red-100 text-red-800', text: 'Erro' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const todayActivities = activities.filter(activity => {
    const activityDate = new Date(activity.timestamp);
    const today = new Date();
    return activityDate.toDateString() === today.toDateString();
  });

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl hover:bg-white transition-all duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
            <MessageSquare className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Feed de Atividades</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-indigo-700">
              {todayActivities.length} atividades hoje
            </span>
          </div>
          <button className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
            <span className="text-xs font-medium text-gray-700">Filtrar</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3 max-h-64 sm:max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {activities.slice(0, 8).map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const colorClasses = getActivityColor(activity.type, activity.status);
          
          return (
            <div key={activity.id} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/80 transition-all duration-200 border border-transparent hover:border-gray-200">
              <div className={`p-2 rounded-lg ${colorClasses} group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-3 sm:w-4 h-3 sm:h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {activity.description}
                    </p>
                    {activity.user && (
                      <p className="text-xs text-gray-600 mt-1">
                        por {activity.user}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(activity.status)}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">Ver todas as atividades</span>
        </button>
      </div>
    </div>
  );
};

export default ActivityLog;