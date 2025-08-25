import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Database,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  Shield,
  Zap,
  Globe,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useAuth } from './JWTAuthSystem';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  plan: 'starter' | 'professional' | 'enterprise' | 'custom';
  status: 'active' | 'suspended' | 'trial' | 'expired';
  userCount: number;
  maxUsers: number;
  storageUsed: number;
  storageLimit: number;
  apiCallsThisMonth: number;
  apiCallsLimit: number;
  createdAt: Date;
  lastActivity: Date;
  billingEmail: string;
  contactPerson: string;
  phone: string;
  address: string;
  customDomain?: string;
  features: string[];
  integrations: string[];
  monthlyRevenue: number;
  settings: {
    allowCustomBranding: boolean;
    enableSSO: boolean;
    enableAPI: boolean;
    enableWebhooks: boolean;
    dataRetentionDays: number;
    maxFileSize: number;
  };
}

interface TenantMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalRevenue: number;
  monthlyGrowth: number;
  averageUsersPerTenant: number;
  totalStorageUsed: number;
  totalApiCalls: number;
  churnRate: number;
}

interface ResourceUsage {
  tenantId: string;
  tenantName: string;
  cpu: number;
  memory: number;
  storage: number;
  bandwidth: number;
  requests: number;
  errors: number;
  uptime: number;
  responseTime: number;
  timestamp: Date;
}

interface TenantAlert {
  id: string;
  tenantId: string;
  tenantName: string;
  type: 'usage' | 'billing' | 'security' | 'performance' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

const MultiTenantDashboard: React.FC = () => {
  const { user: currentUser, hasPermission, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'resources' | 'billing' | 'alerts'>('overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage[]>([]);
  const [alerts, setAlerts] = useState<TenantAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'users' | 'revenue' | 'created' | 'activity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const generateMockTenants = (): Tenant[] => {
    const plans: Tenant['plan'][] = ['starter', 'professional', 'enterprise', 'custom'];
    const statuses: Tenant['status'][] = ['active', 'suspended', 'trial', 'expired'];
    const features = {
      starter: ['Basic Analytics', 'Email Support', 'Standard API'],
      professional: ['Advanced Analytics', 'Priority Support', 'Enhanced API', 'Custom Reports'],
      enterprise: ['Enterprise Analytics', '24/7 Support', 'Premium API', 'Custom Integration', 'SSO', 'Advanced Security'],
      custom: ['All Features', 'Dedicated Support', 'Custom Development', 'SLA Guarantee']
    };

    const tenants: Tenant[] = [];
    const companies = [
      'TechCorp Solutions', 'Digital Innovations Ltd', 'CloudFirst Systems', 'DataDriven Inc',
      'SmartBusiness Co', 'NextGen Technologies', 'InnovateLab', 'FutureTech Enterprises',
      'AgileWorks', 'ScaleUp Solutions', 'ProActive Systems', 'EliteData Corp',
      'VisionTech', 'OptimalFlow', 'CoreBusiness Ltd'
    ];

    for (let i = 0; i < 15; i++) {
      const plan = plans[Math.floor(Math.random() * plans.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const company = companies[i];
      const domain = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      const subdomain = company.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const maxUsers = plan === 'starter' ? 10 : plan === 'professional' ? 50 : plan === 'enterprise' ? 200 : 1000;
      const userCount = Math.floor(Math.random() * maxUsers * 0.8);
      const storageLimit = plan === 'starter' ? 10 : plan === 'professional' ? 100 : plan === 'enterprise' ? 500 : 2000;
      const storageUsed = Math.floor(Math.random() * storageLimit * 0.7);
      const apiCallsLimit = plan === 'starter' ? 10000 : plan === 'professional' ? 100000 : plan === 'enterprise' ? 1000000 : 10000000;
      const apiCallsThisMonth = Math.floor(Math.random() * apiCallsLimit * 0.8);
      
      tenants.push({
        id: `tenant-${i + 1}`,
        name: company,
        domain,
        subdomain,
        plan,
        status,
        userCount,
        maxUsers,
        storageUsed,
        storageLimit,
        apiCallsThisMonth,
        apiCallsLimit,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        billingEmail: `billing@${domain}`,
        contactPerson: `Contact Person ${i + 1}`,
        phone: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        address: `${Math.floor(Math.random() * 9999) + 1} Business St, City, State ${String(Math.floor(Math.random() * 90000) + 10000)}`,
        customDomain: Math.random() > 0.7 ? `custom-${subdomain}.com` : undefined,
        features: features[plan],
        integrations: ['Slack', 'Microsoft Teams', 'Zapier'].slice(0, Math.floor(Math.random() * 3) + 1),
        monthlyRevenue: plan === 'starter' ? 99 : plan === 'professional' ? 299 : plan === 'enterprise' ? 999 : 2999,
        settings: {
          allowCustomBranding: plan !== 'starter',
          enableSSO: plan === 'enterprise' || plan === 'custom',
          enableAPI: true,
          enableWebhooks: plan !== 'starter',
          dataRetentionDays: plan === 'starter' ? 30 : plan === 'professional' ? 90 : 365,
          maxFileSize: plan === 'starter' ? 10 : plan === 'professional' ? 50 : 100
        }
      });
    }

    return tenants;
  };

  const generateMockMetrics = (tenants: Tenant[]): TenantMetrics => {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const trialTenants = tenants.filter(t => t.status === 'trial').length;
    const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;
    const totalRevenue = tenants.reduce((sum, t) => sum + (t.status === 'active' ? t.monthlyRevenue : 0), 0);
    const totalUsers = tenants.reduce((sum, t) => sum + t.userCount, 0);
    const totalStorageUsed = tenants.reduce((sum, t) => sum + t.storageUsed, 0);
    const totalApiCalls = tenants.reduce((sum, t) => sum + t.apiCallsThisMonth, 0);

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalRevenue,
      monthlyGrowth: Math.random() * 20 + 5,
      averageUsersPerTenant: Math.round(totalUsers / totalTenants),
      totalStorageUsed,
      totalApiCalls,
      churnRate: Math.random() * 5 + 1
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (!hasPermission('tenants:read')) {
          setError('Você não tem permissão para acessar o painel multi-tenant');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockTenants = generateMockTenants();
        setTenants(mockTenants);
        setMetrics(generateMockMetrics(mockTenants));
      } catch (err) {
        setError('Erro ao carregar dados dos tenants');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [hasPermission]);

  const filteredTenants = useMemo(() => {
    let filtered = tenants.filter(tenant => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tenant.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tenant.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });

    return filtered;
  }, [tenants, searchTerm, statusFilter, planFilter]);

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPlanColor = (plan: string) => {
    const colors = {
      starter: 'bg-gray-100 text-gray-800',
      professional: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
      custom: 'bg-yellow-100 text-yellow-800'
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro de Acesso</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                Painel Multi-Tenant
              </h1>
              <p className="text-gray-600 mt-2">Gerenciamento centralizado de todos os tenants</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Usuário: <span className="font-medium">{currentUser?.name}</span>
              </div>
              {hasPermission('tenants:write') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo Tenant
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
                { id: 'tenants', label: 'Tenants', icon: Building2, count: tenants.length }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Tenants</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalTenants}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    {metrics.monthlyGrowth.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tenants Ativos</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeTenants}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-gray-500">
                    {((metrics.activeTenants / metrics.totalTenants) * 100).toFixed(1)}% do total
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">12.5%</span>
                  <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Taxa de Churn</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.churnRate.toFixed(1)}%</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600 font-medium">-2.1%</span>
                  <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativo</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspenso</option>
                  <option value="expired">Expirado</option>
                </select>
                
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos os Planos</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTenants.map((tenant) => (
                <div key={tenant.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                        <p className="text-sm text-gray-500">{tenant.domain}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tenant.status)}`}>
                        {tenant.status === 'active' ? 'Ativo' :
                         tenant.status === 'trial' ? 'Trial' :
                         tenant.status === 'suspended' ? 'Suspenso' : 'Expirado'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Plano:</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPlanColor(tenant.plan)}`}>
                        {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Usuários:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {tenant.userCount}/{tenant.maxUsers}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Receita:</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(tenant.monthlyRevenue)}/mês
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Criado: {tenant.createdAt.toLocaleDateString()}</span>
                      <span>Ativo: {tenant.lastActivity.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiTenantDashboard;