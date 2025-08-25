import { jwtDecode } from 'jwt-decode';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  permissions: Permission[];
  tenantId: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  tenantId?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: Record<string, any>;
  isActive: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  limits: {
    users: number;
    apiCalls: number;
    storage: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
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
  tenantId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Auth Service Class
class AuthService {
  private readonly API_BASE = '/api/auth';
  private readonly TOKEN_KEY = 'aithos_access_token';
  private readonly REFRESH_KEY = 'aithos_refresh_token';
  private readonly USER_KEY = 'aithos_user';
  
  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAuth();
  }

  // Initialize authentication state
  private initializeAuth(): void {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const refreshToken = localStorage.getItem(this.REFRESH_KEY);
      const userData = localStorage.getItem(this.USER_KEY);

      if (token && refreshToken && userData) {
        const decoded = jwtDecode<JWTPayload>(token);
        
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          this.tokens = {
            accessToken: token,
            refreshToken,
            expiresAt: new Date(decoded.exp * 1000)
          };
          
          this.currentUser = JSON.parse(userData);
          this.scheduleTokenRefresh();
        } else {
          this.clearAuth();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.clearAuth();
    }
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await fetch(`${this.API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      this.setAuthData(data.user, data.tokens);
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Register user
  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await fetch(`${this.API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result = await response.json();
      
      this.setAuthData(result.user, result.tokens);
      
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      if (this.tokens?.refreshToken) {
        await fetch(`${this.API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Refresh access token
  async refreshToken(): Promise<AuthTokens> {
    try {
      if (!this.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.API_BASE}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      this.tokens = data.tokens;
      this.storeTokens(data.tokens);
      this.scheduleTokenRefresh();
      
      return data.tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuth();
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get access token
  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.tokens && this.tokens.expiresAt > new Date();
  }

  // Check if user has permission
  hasPermission(resource: string, action: string): boolean {
    if (!this.currentUser) return false;
    
    return this.currentUser.permissions.some(
      permission => 
        permission.resource === resource && 
        permission.action === action
    );
  }

  // Check if user has role
  hasRole(roleName: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role.name === roleName;
  }

  // Check if user has any of the roles
  hasAnyRole(roleNames: string[]): boolean {
    if (!this.currentUser) return false;
    return roleNames.includes(this.currentUser.role.name);
  }

  // Get user's tenant
  getTenant(): string | null {
    return this.currentUser?.tenantId || null;
  }

  // Update user profile
  async updateProfile(updates: Partial<Pick<User, 'name' | 'avatar' | 'metadata'>>): Promise<User> {
    try {
      const response = await this.authenticatedRequest('/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const updatedUser = await response.json();
      
      this.currentUser = updatedUser;
      localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await this.authenticatedRequest('/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password change failed');
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset request failed');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password: newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Make authenticated request
  async authenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle token expiration
    if (response.status === 401) {
      try {
        await this.refreshToken();
        
        // Retry request with new token
        return fetch(`${this.API_BASE}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
      } catch (refreshError) {
        this.clearAuth();
        throw new Error('Authentication expired');
      }
    }

    return response;
  }

  // Private methods
  private setAuthData(user: User, tokens: AuthTokens): void {
    this.currentUser = user;
    this.tokens = tokens;
    
    this.storeTokens(tokens);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    this.scheduleTokenRefresh();
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_KEY, tokens.refreshToken);
  }

  private clearAuth(): void {
    this.currentUser = null;
    this.tokens = null;
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokens) return;

    // Refresh token 5 minutes before expiration
    const refreshTime = this.tokens.expiresAt.getTime() - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().catch(console.error);
      }, refreshTime);
    }
  }
}

// Create singleton instance
export const authService = new AuthService();

// Permission constants
export const PERMISSIONS = {
  // User management
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  
  // Role management
  ROLE_READ: 'role:read',
  ROLE_WRITE: 'role:write',
  ROLE_DELETE: 'role:delete',
  
  // Tenant management
  TENANT_READ: 'tenant:read',
  TENANT_WRITE: 'tenant:write',
  TENANT_DELETE: 'tenant:delete',
  
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // System
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_MONITOR: 'system:monitor',
  
  // API
  API_READ: 'api:read',
  API_WRITE: 'api:write',
  API_ADMIN: 'api:admin',
} as const;

// Role constants
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  USER_MANAGER: 'user_manager',
  ANALYST: 'analyst',
  USER: 'user',
  GUEST: 'guest',
} as const;

// Utility functions
export const createPermission = (resource: string, action: string): string => {
  return `${resource}:${action}`;
};

export const parsePermission = (permission: string): { resource: string; action: string } => {
  const [resource, action] = permission.split(':');
  return { resource, action };
};

export default authService;