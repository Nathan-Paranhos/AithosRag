import React, { useState, useEffect } from 'react';
import { AnalyticsHeader } from './analytics/AnalyticsHeader';
import { MetricsCards } from './analytics/MetricsCards';
import { AnalyticsCharts } from './analytics/AnalyticsCharts';
import { ActivityLog } from './analytics/ActivityLog';

interface ChartDataPoint {
  time: string;
  messages: number;
  users: number;
  responseTime: number;
}

interface Activity {
  id: string;
  type: 'message' | 'auth' | 'api' | 'export' | 'config';
  user: string;
  action: string;
  time: string;
}

const DashboardAnalytics: React.FC = () => {
  const [isRealTime, setIsRealTime] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data generation
  const generateMockData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        messages: Math.floor(Math.random() * 100) + 20,
        users: Math.floor(Math.random() * 50) + 10,
        responseTime: Math.floor(Math.random() * 500) + 100
      });
    }
    return data;
  };

  const generateMockActivities = (): Activity[] => {
    const activities: Activity[] = [];
    const users = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Lima'];
    const actions = {
      message: ['enviou uma mensagem', 'respondeu uma pergunta', 'iniciou uma conversa'],
      auth: ['fez login', 'fez logout', 'alterou senha'],
      api: ['fez uma requisição', 'atualizou dados', 'sincronizou informações'],
      export: ['exportou relatório', 'baixou dados', 'gerou backup'],
      config: ['alterou configurações', 'atualizou perfil', 'modificou preferências']
    };

    for (let i = 0; i < 8; i++) {
      const types = Object.keys(actions) as Array<keyof typeof actions>;
      const type = types[Math.floor(Math.random() * types.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[type][Math.floor(Math.random() * actions[type].length)];
      const time = new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString('pt-BR');

      activities.push({
        id: `activity-${i}`,
        type,
        user,
        action,
        time
      });
    }
    return activities;
  };

  useEffect(() => {
    setChartData(generateMockData());
    setActivities(generateMockActivities());

    if (isRealTime) {
      const interval = setInterval(() => {
        setChartData(generateMockData());
        setActivities(generateMockActivities());
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isRealTime]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setChartData(generateMockData());
    setActivities(generateMockActivities());
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ chartData, activities }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <AnalyticsHeader 
          isRealTime={isRealTime}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onToggleRealTime={() => setIsRealTime(!isRealTime)}
        />

        {/* Stats Cards */}
         <MetricsCards 
           chartData={chartData}
         />

        {/* Charts */}
         <AnalyticsCharts 
           chartData={chartData}
         />

        {/* Activity Feed */}
         <ActivityLog 
           activities={activities}
         />
      </div>
    </div>
  );
};

export { DashboardAnalytics };