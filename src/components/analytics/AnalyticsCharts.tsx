import React from 'react';
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
  BarChart3,
  Activity
} from 'lucide-react';

interface ChartDataPoint {
  time: string;
  messages: number;
  users: number;
  responseTime: number;
}

interface AnalyticsChartsProps {
  chartData: ChartDataPoint[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ chartData }) => {
  const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    backdropFilter: 'blur(10px)',
    fontSize: '12px'
  };

  const axisStyle = {
    fontSize: 10,
    tick: { fontSize: 9, fill: '#64748b' },
    axisLine: { stroke: '#cbd5e1' }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
      {/* Messages Chart */}
      <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl hover:bg-white transition-all duration-500 transform hover:scale-[1.02]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
              <BarChart3 className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors duration-300">Volume de Mensagens</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full self-start sm:self-auto">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-blue-700">Últimas 24h</span>
          </div>
        </div>
        <div className="h-64 sm:h-72 md:h-80 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-50/50 to-transparent rounded-xl pointer-events-none"></div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
              <XAxis 
                dataKey="time" 
                {...axisStyle}
                interval="preserveStartEnd"
              />
              <YAxis 
                {...axisStyle}
                width={30}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar 
                dataKey="messages" 
                fill="url(#blueGradient)" 
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity duration-200"
              />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="group bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl hover:bg-white transition-all duration-500 transform hover:scale-[1.02]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg">
              <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-green-800 transition-colors duration-300">Tempo de Resposta</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full self-start sm:self-auto">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-700">Monitorando</span>
          </div>
        </div>
        <div className="h-64 sm:h-72 md:h-80 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-green-50/50 to-transparent rounded-xl pointer-events-none"></div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
              <XAxis 
                dataKey="time" 
                {...axisStyle}
                interval="preserveStartEnd"
              />
              <YAxis 
                {...axisStyle}
                width={30}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line 
                type="monotone" 
                dataKey="responseTime" 
                stroke="url(#greenGradient)" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2, fill: '#ffffff' }}
                className="drop-shadow-sm"
              />
              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;