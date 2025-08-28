import { jwtDecode } from 'jwt-decode';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  tenantId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: Record<string, unknown>;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
  inviteCode?: string;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  permissions: string[];
  tenantId?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthState {
  user: User;
  tokens: AuthTokens;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  requiresTwoFactor?: boolean;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresAt: Date;
}

// JWT Auth Service
class JWTAuthService {
  private readonly API_BASE = '/api/auth';
  private readonly TOKEN_KEY = 'aithos_auth_tokens';
  private readonly USER_KEY = 'aithos_user';
  private refreshTimer: NodeJS.Timeout | null = null;
  private currentUser: User | null = null;
  private currentTokens: AuthTokens | null = null;

  constructor() {
    this.initializeFromStorage();
    this.setupTokenRefresh();
  }

  // Initialize from localStorage
  private initializeFromStorage(): void {
    try {
      const tokensData = localStorage.getItem(this.TOKEN_KEY);
      const userData = localStorage.getItem(this.USER_KEY);

      if (tokensData && userData) {
        const tokens = JSON.parse(tokensData) as AuthTokens;
        const user = JSON.parse(userData) as User;

        // Check if token is still valid
        if (new Date(tokens.expiresAt) > new Date()) {
          this.currentTokens = {
            ...tokens,
            expiresAt: new Date(tokens.expiresAt)
          };
          this.currentUser = {
            ...user,
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt)
          };
        } else {
          // Token expired, clear storage
          this.clearStorage();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth from storage:', error);
      this.clearStorage();
    }
  }

  // Setup automatic token refresh
  private setupTokenRefresh(): void {
    if (this.currentTokens) {
      const expiresAt = new Date(this.currentTokens.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000); // 5 minutes before expiry, minimum 1 minute

      if (refreshTime > 0) {
        this.refreshTimer = setTimeout(() => {
          this.refreshToken().catch(console.error);
        }, refreshTime);
      }
    }
  }

  // Clear refresh timer
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Store auth data
  private storeAuthData(user: User, tokens: AuthTokens): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokens));
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this.currentUser = user;
      this.currentTokens = tokens;
      this.setupTokenRefresh();
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  // Clear storage
  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser = null;
    this.currentTokens = null;
    this.clearRefreshTimer();
  }

  // Mock API call - replace with actual API calls
  private async mockApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const { body } = options;
    const data = body ? JSON.parse(body as string) : null;

    // Mock responses based on endpoint
    switch (endpoint) {
      case '/login':
        return this.mockLogin(data) as T;
      case '/register':
        return this.mockRegister(data) as T;
      case '/refresh':
        return this.mockRefreshToken() as T;
      case '/logout':
        return this.mockLogout() as T;
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  // Mock login
  private mockLogin(credentials: LoginCredentials): LoginResponse {
    // Simulate validation
    if (!credentials.email || !credentials.password) {
      throw new Error('Email e senha são obrigatórios');
    }

    if (credentials.email === 'admin@aithos.com' && credentials.password === 'admin123') {
      const user: User = {
        id: 'user_admin_001',
        email: 'admin@aithos.com',
        name: 'Administrador Sistema',
        role: {
          id: 'role_admin',
          name: 'admin',
          description: 'Administrador do Sistema',
          level: 100,
          permissions: [
            { id: 'perm_1', name: 'Gerenciar Usuários', resource: 'users', action: 'manage' },
            { id: 'perm_2', name: 'Gerenciar Sistema', resource: 'system', action: 'manage' },
            { id: 'perm_3', name: 'Ver Analytics', resource: 'analytics', action: 'read' },
            { id: 'perm_4', name: 'Gerenciar Tenants', resource: 'tenants', action: 'manage' },
            { id: 'perm_5', name: 'Configurar Segurança', resource: 'security', action: 'manage' }
          ]
        },
        permissions: [
          { id: 'perm_1', name: 'Gerenciar Usuários', resource: 'users', action: 'manage' },
          { id: 'perm_2', name: 'Gerenciar Sistema', resource: 'system', action: 'manage' },
          { id: 'perm_3', name: 'Ver Analytics', resource: 'analytics', action: 'read' },
          { id: 'perm_4', name: 'Gerenciar Tenants', resource: 'tenants', action: 'manage' },
          { id: 'perm_5', name: 'Configurar Segurança', resource: 'security', action: 'manage' },
          { id: 'perm_6', name: 'Exportar Dados', resource: 'data', action: 'export' },
          { id: 'perm_7', name: 'Configurar Integrações', resource: 'integrations', action: 'manage' },
          { id: 'perm_8', name: 'Ver Logs de Auditoria', resource: 'audit', action: 'read' }
        ],
        tenantId: credentials.tenantId || 'tenant_default',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        metadata: {
          loginCount: 42,
          lastIp: '192.168.1.100',
          preferences: {
            theme: 'dark',
            language: 'pt-BR',
            notifications: true
          }
        }
      };

      const tokens: AuthTokens = {
        accessToken: this.generateMockJWT(user),
        refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        tokenType: 'Bearer'
      };

      return { user, tokens };
    } else if (credentials.email === 'user@aithos.com' && credentials.password === 'user123') {
      const user: User = {
        id: 'user_regular_001',
        email: 'user@aithos.com',
        name: 'Usuário Regular',
        role: {
          id: 'role_user',
          name: 'user',
          description: 'Usuário Regular',
          level: 10,
          permissions: [
            { id: 'perm_3', name: 'Ver Analytics', resource: 'analytics', action: 'read' },
            { id: 'perm_9', name: 'Ver Próprio Perfil', resource: 'profile', action: 'read' }
          ]
        },
        permissions: [
          { id: 'perm_3', name: 'Ver Analytics', resource: 'analytics', action: 'read' },
          { id: 'perm_9', name: 'Ver Próprio Perfil', resource: 'profile', action: 'read' },
          { id: 'perm_10', name: 'Usar Chat', resource: 'chat', action: 'use' },
          { id: 'perm_11', name: 'Fazer Upload', resource: 'files', action: 'upload' }
        ],
        tenantId: credentials.tenantId || 'tenant_default',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date(),
        metadata: {
          loginCount: 15,
          lastIp: '192.168.1.101',
          preferences: {
            theme: 'light',
            language: 'pt-BR',
            notifications: false
          }
        }
      };

      const tokens: AuthTokens = {
        accessToken: this.generateMockJWT(user),
        refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        tokenType: 'Bearer'
      };

      return { user, tokens };
    } else {
      throw new Error('Credenciais inválidas');
    }
  }

  // Mock register
  private mockRegister(data: RegisterData): LoginResponse {
    // Simulate validation
    if (!data.email || !data.password || !data.name) {
      throw new Error('Todos os campos são obrigatórios');
    }

    if (data.password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres');
    }

    // Check if email already exists (mock)
    if (data.email === 'admin@aithos.com' || data.email === 'user@aithos.com') {
      throw new Error('Este email já está em uso');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      name: data.name,
      role: {
        id: 'role_user',
        name: 'user',
        description: 'Usuário Regular',
        level: 10,
        permissions: [
          { id: 'perm_3', name: 'Ver Analytics', resource: 'analytics', action: 'read' },
          { id: 'perm_9', name: 'Ver Próprio Perfil', resource: 'profile', action: 'read' }
        ]
      },
      permissions: [
        { id: 'perm_3', name: 'Ver Analytics', resource: 'analytics', action: 'read' },
        { id: 'perm_9', name: 'Ver Próprio Perfil', resource: 'profile', action: 'read' },
        { id: 'perm_10', name: 'Usar Chat', resource: 'chat', action: 'use' },
        { id: 'perm_11', name: 'Fazer Upload', resource: 'files', action: 'upload' }
      ],
      tenantId: data.tenantId || 'tenant_default',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        loginCount: 1,
        lastIp: '192.168.1.102',
        preferences: {
          theme: 'light',
          language: 'pt-BR',
          notifications: true
        }
      }
    };

    const tokens: AuthTokens = {
      accessToken: this.generateMockJWT(user),
      refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      tokenType: 'Bearer'
    };

    return { user, tokens };
  }

  // Mock refresh token
  private mockRefreshToken(): RefreshTokenResponse {
    if (!this.currentUser || !this.currentTokens) {
      throw new Error('No active session');
    }

    return {
      accessToken: this.generateMockJWT(this.currentUser),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };
  }

  // Mock logout
  private mockLogout(): { success: boolean } {
    return { success: true };
  }

  // Generate mock JWT
  private generateMockJWT(user: User): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions: user.permissions.map(p => `${p.resource}:${p.action}`),
      tenantId: user.tenantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iss: 'aithos-rag',
      aud: 'aithos-rag-client'
    };

    // This is a mock JWT - in production, use a proper JWT library
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = btoa(`mock_signature_${Date.now()}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // Public methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.mockApiCall<LoginResponse>('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    this.storeAuthData(response.user, response.tokens);
    return response;
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.mockApiCall<LoginResponse>('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    this.storeAuthData(response.user, response.tokens);
    return response;
  }

  async logout(): Promise<void> {
    try {
      if (this.currentTokens) {
        await this.mockApiCall('/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.currentTokens.accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearStorage();
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    try {
      if (!this.currentTokens) {
        throw new Error('No refresh token available');
      }

      const response = await this.mockApiCall<RefreshTokenResponse>('/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.currentTokens.refreshToken}`
        }
      });

      const newTokens: AuthTokens = {
        ...this.currentTokens,
        accessToken: response.accessToken,
        expiresAt: response.expiresAt
      };

      this.storeAuthData(this.currentUser!, newTokens);
      return newTokens;
    } catch (error) {
      this.clearStorage();
      throw error;
    }
  }

  getCurrentUser(): AuthState | null {
    if (this.currentUser && this.currentTokens) {
      return {
        user: this.currentUser,
        tokens: this.currentTokens
      };
    }
    return null;
  }

  getAccessToken(): string | null {
    return this.currentTokens?.accessToken || null;
  }

  isAuthenticated(): boolean {
    return !!(this.currentUser && this.currentTokens && new Date(this.currentTokens.expiresAt) > new Date());
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    
    const [resource, action] = permission.split(':');
    return this.currentUser.permissions.some(p => 
      p.resource === resource && p.action === action
    );
  }

  hasRole(roleName: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role.name === roleName;
  }

  hasAnyRole(roleNames: string[]): boolean {
    if (!this.currentUser) return false;
    return roleNames.includes(this.currentUser.role.name);
  }

  getTenantId(): string | null {
    return this.currentUser?.tenantId || null;
  }

  // Decode JWT payload (for debugging)
  decodeToken(token?: string): JWTPayload | null {
    try {
      const tokenToUse = token || this.currentTokens?.accessToken;
      if (!tokenToUse) return null;

      return jwtDecode<JWTPayload>(tokenToUse);
    } catch (error: unknown) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  }

  // Get token expiry time
  getTokenExpiry(): Date | null {
    return this.currentTokens?.expiresAt || null;
  }

  // Check if token is about to expire (within 5 minutes)
  isTokenExpiringSoon(): boolean {
    if (!this.currentTokens) return false;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return new Date(this.currentTokens.expiresAt) <= fiveMinutesFromNow;
  }

  // Cleanup method
  destroy(): void {
    this.clearRefreshTimer();
    this.clearStorage();
  }
}

// Export singleton instance
export const jwtAuthService = new JWTAuthService();
export default jwtAuthService;