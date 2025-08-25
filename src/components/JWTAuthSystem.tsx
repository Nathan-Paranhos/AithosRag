import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  User,
  Mail,
  Key,
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone,
  Globe,
  Settings,
  LogOut,
  UserPlus,
  Building,
  Crown,
  Activity
} from 'lucide-react';
import { jwtAuthService, User as AuthUser, AuthTokens, LoginCredentials, RegisterData } from '../services/jwtAuthService';

// Types
interface AuthContextType {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginFormData {
  email: string;
  password: string;
  tenantId?: string;
  rememberMe: boolean;
  twoFactorCode?: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  tenantId?: string;
  inviteCode?: string;
  acceptTerms: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'token_refresh' | 'suspicious_activity';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  details: Record<string, any>;
}

// Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const authState = await jwtAuthService.getCurrentUser();
      if (authState) {
        setUser(authState.user);
        setTokens(authState.tokens);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const result = await jwtAuthService.login(credentials);
      setUser(result.user);
      setTokens(result.tokens);
      
      // Log security event
      logSecurityEvent({
        type: 'login',
        details: { email: credentials.email, tenantId: credentials.tenantId }
      });
    } catch (error) {
      // Log failed login
      logSecurityEvent({
        type: 'failed_login',
        details: { email: credentials.email, error: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const result = await jwtAuthService.register(data);
      setUser(result.user);
      setTokens(result.tokens);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await jwtAuthService.logout();
      setUser(null);
      setTokens(null);
      
      // Log security event
      logSecurityEvent({
        type: 'logout',
        details: {}
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshToken = async () => {
    try {
      const newTokens = await jwtAuthService.refreshToken();
      setTokens(newTokens);
      
      // Log security event
      logSecurityEvent({
        type: 'token_refresh',
        details: {}
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return jwtAuthService.hasPermission(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return jwtAuthService.hasRole(role);
  };

  const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>) => {
    const securityEvent: SecurityEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ipAddress: '192.168.1.1', // Would be actual IP in production
      userAgent: navigator.userAgent,
      ...event
    };
    
    setSecurityEvents(prev => [securityEvent, ...prev.slice(0, 99)]); // Keep last 100 events
  };

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    hasPermission,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// JWT Authentication System Component
const JWTAuthSystem: React.FC = () => {
  const { user, isAuthenticated, login, register, logout, hasPermission, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile' | 'security'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  
  const [loginForm, setLoginForm] = useState<LoginFormData>({
    email: '',
    password: '',
    tenantId: '',
    rememberMe: false,
    twoFactorCode: ''
  });
  
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    tenantId: '',
    inviteCode: '',
    acceptTerms: false
  });

  const [securityEvents] = useState<SecurityEvent[]>([
    {
      id: '1',
      type: 'login',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      ipAddress: '192.168.1.100',
      userAgent: 'Chrome/120.0.0.0',
      location: 'New York, US',
      details: { success: true }
    },
    {
      id: '2',
      type: 'failed_login',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      ipAddress: '192.168.1.101',
      userAgent: 'Firefox/121.0.0.0',
      location: 'London, UK',
      details: { reason: 'Invalid password', attempts: 3 }
    },
    {
      id: '3',
      type: 'password_change',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      ipAddress: '192.168.1.100',
      userAgent: 'Chrome/120.0.0.0',
      location: 'New York, US',
      details: { success: true }
    }
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await login({
        email: loginForm.email,
        password: loginForm.password,
        tenantId: loginForm.tenantId || undefined
      });
      setSuccess('Login realizado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (!registerForm.acceptTerms) {
      setError('Você deve aceitar os termos de uso');
      setLoading(false);
      return;
    }

    try {
      await register({
        email: registerForm.email,
        password: registerForm.password,
        name: registerForm.name,
        tenantId: registerForm.tenantId || undefined,
        inviteCode: registerForm.inviteCode || undefined
      });
      setSuccess('Conta criada com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no registro');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSuccess('Logout realizado com sucesso!');
    } catch (err) {
      setError('Erro no logout');
    }
  };

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'logout': return <LogOut className="w-4 h-4 text-blue-500" />;
      case 'failed_login': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'password_change': return <Key className="w-4 h-4 text-purple-500" />;
      case 'token_refresh': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'suspicious_activity': return <Shield className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login': return 'bg-green-50 border-green-200';
      case 'logout': return 'bg-blue-50 border-blue-200';
      case 'failed_login': return 'bg-red-50 border-red-200';
      case 'password_change': return 'bg-purple-50 border-purple-200';
      case 'token_refresh': return 'bg-orange-50 border-orange-200';
      case 'suspicious_activity': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <p className="text-gray-600">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700 capitalize">{user.role.name}</span>
                    {user.tenantId && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Building className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">{user.tenantId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'profile', label: 'Perfil', icon: User },
                  { id: 'security', label: 'Segurança', icon: Shield }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                          <div className="text-gray-900">{user.name}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <div className="text-gray-900">{user.email}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-900 capitalize">{user.role.name}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-600 capitalize">{user.isActive ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Permissões</h3>
                      <div className="space-y-2">
                        {user.permissions.slice(0, 8).map((permission, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-gray-700">{permission.name}</span>
                          </div>
                        ))}
                        {user.permissions.length > 8 && (
                          <div className="text-sm text-gray-500">
                            +{user.permissions.length - 8} mais permissões
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Eventos de Segurança Recentes</h3>
                    <div className="space-y-3">
                      {securityEvents.map(event => (
                        <div key={event.id} className={`p-4 rounded-lg border ${getEventColor(event.type)}`}>
                          <div className="flex items-start gap-3">
                            {getEventIcon(event.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 capitalize">
                                  {event.type.replace('_', ' ')}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {event.timestamp.toLocaleString()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>IP: {event.ipAddress}</div>
                                <div>Localização: {event.location || 'Desconhecida'}</div>
                                <div>User Agent: {event.userAgent}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Auth Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Aithos RAG Enterprise</h1>
            <p className="text-gray-300">Sistema de Autenticação JWT</p>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'login'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'register'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Registro
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-200 text-sm">{success}</span>
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tenant ID (Opcional)
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={loginForm.tenantId}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, tenantId: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tenant-id"
                  />
                </div>
              </div>

              {twoFactorRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Código 2FA
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={loginForm.twoFactorCode}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, twoFactorCode: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-gray-300">Lembrar-me</span>
                </label>
                <button type="button" className="text-sm text-blue-400 hover:text-blue-300">
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Código de Convite (Opcional)
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={registerForm.inviteCode}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, inviteCode: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="INVITE-CODE"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={registerForm.acceptTerms}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                  required
                />
                <label className="ml-2 text-sm text-gray-300">
                  Aceito os{' '}
                  <button type="button" className="text-blue-400 hover:text-blue-300 underline">
                    termos de uso
                  </button>
                  {' '}e{' '}
                  <button type="button" className="text-blue-400 hover:text-blue-300 underline">
                    política de privacidade
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            © 2024 Aithos RAG Enterprise. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JWTAuthSystem;