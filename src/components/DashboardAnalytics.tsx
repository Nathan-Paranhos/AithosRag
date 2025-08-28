import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  Users,
  MessageSquare,
  Clock,
  Download,
  Filter,
  Zap,
  Shield,
  RefreshCw,
  XCircle,
  BarChart3,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  avgResponseTime: number;
  successRate: number;
  apiCalls: number;
  errorRate: number;
  uptime: number;
  dataProcessed: number;
  securityEvents: number;
}

interface ChartData {
  time: string;
  messages: number;
  users: number;
  responseTime: number;
}

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  time: string;
  type: string;
}

interface KPICard {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: 'up' | 'down';
}

const mockActivities: ActivityItem[] = [
  { id: 1, user: 'João Silva', action: 'Enviou mensagem', time: '2 min atrás', type: 'message' },
  { id: 2, user: 'Maria Santos', action: 'Login realizado', time: '5 min atrás', type: 'auth' },
  { id: 3, user: 'Pedro Costa', action: 'API chamada', time: '8 min atrás', type: 'api' },
  { id: 4, user: 'Ana Lima', action: 'Dados exportados', time: '12 min atrás', type: 'export' },
  { id: 5, user: 'Carlos Rocha', action: 'Configuração alterada', time: '15 min atrás', type: 'config' }
];

const DashboardAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activities] = useState<ActivityItem[]>(mockActivities);
  const [isRealTime, setIsRealTime] = useState(true);

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    avgResponseTime: 0,
    successRate: 0,
    apiCalls: 0,
    errorRate: 0,
    uptime: 0,
    dataProcessed: 0,
    securityEvents: 0
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);

  // Simular dados em tempo real
  useEffect(() => {
    const generateRealTimeData = () => {
      const now = new Date();
      const newAnalytics: AnalyticsData = {
        totalUsers: Math.floor(Math.random() * 10000) + 5000,
        activeUsers: Math.floor(Math.random() * 500) + 100,
        totalMessages: Math.floor(Math.random() * 50000) + 25000,
        avgResponseTime: Math.random() * 2000 + 500,
        successRate: 95 + Math.random() * 4,
        apiCalls: Math.floor(Math.random() * 100000) + 50000,
        errorRate: Math.random() * 2,
        uptime: 99.5 + Math.random() * 0.4,
        dataProcessed: Math.floor(Math.random() * 1000) + 500,
        securityEvents: Math.floor(Math.random() * 10)
      };

      setAnalytics(newAnalytics);

      // Gerar dados do gráfico
      const newChartData: ChartData[] = [];
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        newChartData.push({
          time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          messages: Math.floor(Math.random() * 1000) + 200,
          users: Math.floor(Math.random() * 100) + 20,
          responseTime: Math.random() * 2000 + 500
        });
      }
      setChartData(newChartData);
      setLoading(false);
      setLastUpdated(new Date());
    };

    generateRealTimeData();
    const interval = setInterval(generateRealTimeData, 5000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'auth': return <Shield className="w-4 h-4" />;
      case 'api': return <Zap className="w-4 h-4" />;
      case 'export': return <Download className="w-4 h-4" />;
      case 'config': return <Activity className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-600 bg-blue-50';
      case 'auth': return 'text-green-600 bg-green-50';
      case 'api': return 'text-purple-600 bg-purple-50';
      case 'export': return 'text-indigo-600 bg-indigo-50';
      case 'config': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simular refresh
    setTimeout(() => {
      setLoading(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Métrica,Valor\n" +
      `Usuários Ativos,${analytics.activeUsers}\n` +
      `Mensagens Totais,${analytics.totalMessages}\n` +
      `Tempo de Resposta,${Math.round(analytics.avgResponseTime)}ms\n` +
      `Taxa de Sucesso,${analytics.successRate.toFixed(1)}%\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpiCards: KPICard[] = [
    {
      title: 'Usuários Ativos',
      value: analytics.activeUsers.toLocaleString(),
      change: '+12.5%',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      trend: 'up'
    },
    {
      title: 'Mensagens Hoje',
      value: analytics.totalMessages.toLocaleString(),
      change: '+8.2%',
      icon: MessageSquare,
      color: 'from-green-500 to-green-600',
      trend: 'up'
    },
    {
      title: 'Tempo Resposta',
      value: `${Math.round(analytics.avgResponseTime)}ms`,
      change: '-5.1%',
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
      trend: 'down'
    },
    {
      title: 'Taxa Sucesso',
      value: `${analytics.successRate.toFixed(1)}%`,
      change: '+0.3%',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      trend: 'up'
    },
    {
      title: 'Chamadas API',
      value: analytics.apiCalls.toLocaleString(),
      change: '+15.7%',
      icon: Zap,
      color: 'from-yellow-500 to-yellow-600',
      trend: 'up'
    },
    {
      title: 'Uptime',
      value: `${analytics.uptime.toFixed(2)}%`,
      change: '+0.1%',
      icon: Activity,
      color: 'from-cyan-500 to-cyan-600',
      trend: 'up'
    },
    {
      title: 'Dados Processados',
      value: `${analytics.dataProcessed}GB`,
      change: '+22.4%',
      icon: Database,
      color: 'from-indigo-500 to-indigo-600',
      trend: 'up'
    },
    {
      title: 'Eventos Segurança',
      value: analytics.securityEvents.toString(),
      change: '-45.2%',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      trend: 'down'
    }
  ];

  if (loading && chartData.length === 0) {
    return (
      <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-lg text-gray-600">Carregando analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Analytics</h1>
          <p className="text-gray-600">Métricas em tempo real do sistema Aithos RAG</p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">
              Última atualização: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
            <div className={`w-2 h-2 rounded-full ${
              isRealTime ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600">
              {isRealTime ? 'Tempo Real' : 'Pausado'}
            </span>
          </div>
          
          {/* Controls */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isRealTime 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isRealTime ? 'Pausar' : 'Iniciar'}
          </button>
        </div>
      </div>



      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${kpi.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`text-sm font-medium ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.change}
                </div>
              </div>
              <div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">{kpi.title}</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {kpi.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Messages Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Mensagens por Hora</h3>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="messages" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time Chart */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Tempo de Resposta</h3>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="responseTime" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Atividades Recentes
          </h3>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors text-sm">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
            <button className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium">
              Ver Todas
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium truncate">
                  <span className="font-semibold">{activity.user}</span> {activity.action}
                </p>
                <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                activity.type === 'message' ? 'bg-blue-100 text-blue-700' :
                activity.type === 'auth' ? 'bg-green-100 text-green-700' :
                activity.type === 'api' ? 'bg-purple-100 text-purple-700' :
                activity.type === 'export' ? 'bg-indigo-100 text-indigo-700' :
                activity.type === 'config' ? 'bg-gray-100 text-gray-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {activity.type}
              </div>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        
        {/* Activity Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activities.filter(a => a.type === 'message').length}</div>
              <div className="text-xs text-gray-500">Mensagens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activities.filter(a => a.type === 'auth').length}</div>
              <div className="text-xs text-gray-500">Autenticações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{activities.filter(a => a.type === 'api').length}</div>
              <div className="text-xs text-gray-500">API Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{activities.filter(a => a.type === 'error').length}</div>
              <div className="text-xs text-gray-500">Outros</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAnalytics;