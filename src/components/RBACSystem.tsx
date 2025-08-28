import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  Key,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Save,
  X,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Crown,
  Star,
  Zap
} from 'lucide-react';
import { useAuth } from './JWTAuthSystem';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  category: 'system' | 'user' | 'content' | 'analytics' | 'security';
  level: 'read' | 'write' | 'admin' | 'owner';
  createdAt: Date;
  updatedAt: Date;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: string;
  isSystem: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  permission: string;
  result: 'granted' | 'denied';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

const RBACSystem: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'assignments' | 'logs'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Role | Permission | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Generate mock data
  const generateMockPermissions = (): Permission[] => {
    const permissions: Permission[] = [
      // System permissions
      { id: 'sys-admin', name: 'System Admin', description: 'Full system administration', resource: 'system', action: 'admin', category: 'system', level: 'owner', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'sys-config', name: 'System Config', description: 'Configure system settings', resource: 'system', action: 'write', category: 'system', level: 'admin', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'sys-monitor', name: 'System Monitor', description: 'Monitor system health', resource: 'system', action: 'read', category: 'system', level: 'read', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      
      // User permissions
      { id: 'user-create', name: 'Create Users', description: 'Create new user accounts', resource: 'users', action: 'create', category: 'user', level: 'write', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'user-read', name: 'View Users', description: 'View user information', resource: 'users', action: 'read', category: 'user', level: 'read', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'user-update', name: 'Update Users', description: 'Update user information', resource: 'users', action: 'update', category: 'user', level: 'write', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'user-delete', name: 'Delete Users', description: 'Delete user accounts', resource: 'users', action: 'delete', category: 'user', level: 'admin', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      
      // Content permissions
      { id: 'content-create', name: 'Create Content', description: 'Create new content', resource: 'content', action: 'create', category: 'content', level: 'write', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'content-read', name: 'View Content', description: 'View content', resource: 'content', action: 'read', category: 'content', level: 'read', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'content-update', name: 'Update Content', description: 'Update existing content', resource: 'content', action: 'update', category: 'content', level: 'write', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'content-delete', name: 'Delete Content', description: 'Delete content', resource: 'content', action: 'delete', category: 'content', level: 'admin', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      
      // Analytics permissions
      { id: 'analytics-view', name: 'View Analytics', description: 'View analytics data', resource: 'analytics', action: 'read', category: 'analytics', level: 'read', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'analytics-export', name: 'Export Analytics', description: 'Export analytics data', resource: 'analytics', action: 'export', category: 'analytics', level: 'write', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      
      // Security permissions
      { id: 'security-audit', name: 'Security Audit', description: 'Access security audit logs', resource: 'security', action: 'read', category: 'security', level: 'admin', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
      { id: 'security-config', name: 'Security Config', description: 'Configure security settings', resource: 'security', action: 'write', category: 'security', level: 'admin', createdAt: new Date('2024-01-01'), updatedAt: new Date() }
    ];
    return permissions;
  };

  const generateMockRoles = (): Role[] => {
    const roles: Role[] = [
      {
        id: 'super-admin',
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        permissions: ['sys-admin', 'sys-config', 'sys-monitor', 'user-create', 'user-read', 'user-update', 'user-delete', 'content-create', 'content-read', 'content-update', 'content-delete', 'analytics-view', 'analytics-export', 'security-audit', 'security-config'],
        color: '#0ea5e9',
        icon: 'Crown',
        isSystem: true,
        userCount: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Administrative access with most permissions',
        permissions: ['sys-config', 'sys-monitor', 'user-create', 'user-read', 'user-update', 'content-create', 'content-read', 'content-update', 'content-delete', 'analytics-view', 'analytics-export'],
        color: '#38bdf8',
        icon: 'Star',
        isSystem: true,
        userCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Management access with content and user permissions',
        permissions: ['user-read', 'user-update', 'content-create', 'content-read', 'content-update', 'analytics-view'],
        color: '#0ea5e9',
        icon: 'Users',
        isSystem: false,
        userCount: 12,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      },
      {
        id: 'editor',
        name: 'Content Editor',
        description: 'Content creation and editing permissions',
        permissions: ['content-create', 'content-read', 'content-update'],
        color: '#0284c7',
        icon: 'Edit',
        isSystem: false,
        userCount: 25,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to content and basic analytics',
        permissions: ['content-read', 'analytics-view'],
        color: '#64748b',
        icon: 'Eye',
        isSystem: false,
        userCount: 150,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      }
    ];
    return roles;
  };

  const generateMockAssignments = (): RoleAssignment[] => {
    const assignments: RoleAssignment[] = [
      { id: '1', userId: 'user-1', roleId: 'super-admin', assignedBy: 'system', assignedAt: new Date('2024-01-01'), isActive: true },
      { id: '2', userId: 'user-2', roleId: 'admin', assignedBy: 'user-1', assignedAt: new Date('2024-01-15'), isActive: true },
      { id: '3', userId: 'user-3', roleId: 'manager', assignedBy: 'user-1', assignedAt: new Date('2024-02-01'), isActive: true },
      { id: '4', userId: 'user-4', roleId: 'editor', assignedBy: 'user-2', assignedAt: new Date('2024-02-15'), isActive: true },
      { id: '5', userId: 'user-5', roleId: 'viewer', assignedBy: 'user-3', assignedAt: new Date('2024-03-01'), isActive: true }
    ];
    return assignments;
  };

  const generateMockAccessLogs = (): AccessLog[] => {
    const actions = ['login', 'logout', 'create_user', 'update_user', 'delete_user', 'view_analytics', 'export_data', 'update_content'];
    const resources = ['users', 'content', 'analytics', 'system', 'security'];
    const results: ('granted' | 'denied')[] = ['granted', 'granted', 'granted', 'denied', 'granted'];
    
    const logs: AccessLog[] = [];
    for (let i = 0; i < 50; i++) {
      logs.push({
        id: `log-${i + 1}`,
        userId: `user-${Math.floor(Math.random() * 10) + 1}`,
        userName: `User ${Math.floor(Math.random() * 10) + 1}`,
        action: actions[Math.floor(Math.random() * actions.length)],
        resource: resources[Math.floor(Math.random() * resources.length)],
        permission: `${resources[Math.floor(Math.random() * resources.length)]}:${['read', 'write', 'admin'][Math.floor(Math.random() * 3)]}`,
        result: results[Math.floor(Math.random() * results.length)],
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    }
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Check permissions
        if (!hasPermission('security:read')) {
          setError('Você não tem permissão para acessar o sistema RBAC');
          return;
        }

        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setPermissions(generateMockPermissions());
        setRoles(generateMockRoles());
        setAssignments(generateMockAssignments());
        setAccessLogs(generateMockAccessLogs());
      } catch {
        setError('Erro ao carregar dados do RBAC');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [hasPermission]);

  // Filter functions
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           role.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [roles, searchTerm]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           permission.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || permission.category === filterCategory;
      const matchesLevel = filterLevel === 'all' || permission.level === filterLevel;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [permissions, searchTerm, filterCategory, filterLevel]);

  const filteredLogs = useMemo(() => {
    return accessLogs.filter(log => {
      const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.resource.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [accessLogs, searchTerm]);

  const getCategoryColor = (category: string) => {
    const colors = {
      system: 'bg-red-100 text-red-800',
      user: 'bg-blue-100 text-blue-800',
      content: 'bg-green-100 text-green-800',
      analytics: 'bg-purple-100 text-purple-800',
      security: 'bg-orange-100 text-orange-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getLevelColor = (level: string) => {
    const colors = {
      read: 'bg-green-100 text-green-800',
      write: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-orange-100 text-orange-800',
      owner: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getResultColor = (result: string) => {
    return result === 'granted' ? 'text-green-600' : 'text-red-600';
  };

  const getResultIcon = (result: string) => {
    return result === 'granted' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />;
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                Sistema RBAC
              </h1>
              <p className="text-gray-600 mt-2">Gerenciamento de Papéis e Permissões</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Usuário: <span className="font-medium">{currentUser?.name}</span>
              </div>
              {hasPermission('security:write') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar {activeTab === 'roles' ? 'Papel' : 'Permissão'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'roles', label: 'Papéis', icon: Users, count: roles.length },
                { id: 'permissions', label: 'Permissões', icon: Key, count: permissions.length },
                { id: 'assignments', label: 'Atribuições', icon: UserCheck, count: assignments.length },
                { id: 'logs', label: 'Logs de Acesso', icon: Eye, count: accessLogs.length }
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
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {activeTab === 'permissions' && (
              <>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="system">Sistema</option>
                  <option value="user">Usuário</option>
                  <option value="content">Conteúdo</option>
                  <option value="analytics">Analytics</option>
                  <option value="security">Segurança</option>
                </select>
                
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos os Níveis</option>
                  <option value="read">Leitura</option>
                  <option value="write">Escrita</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Proprietário</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'roles' && (
            <div className="p-6">
              <div className="grid gap-6">
                {filteredRoles.map((role) => (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          {role.icon === 'Crown' && <Crown className="w-6 h-6" />}
                          {role.icon === 'Star' && <Star className="w-6 h-6" />}
                          {role.icon === 'Users' && <Users className="w-6 h-6" />}
                          {role.icon === 'Edit' && <Edit className="w-6 h-6" />}
                          {role.icon === 'Eye' && <Eye className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                            {role.isSystem && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                Sistema
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-3">{role.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{role.userCount} usuários</span>
                            <span>{role.permissions.length} permissões</span>
                            <span>Criado em {role.createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {hasPermission('security:write') && !role.isSystem && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(role);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Handle delete
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Permissions */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Permissões:</h4>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.slice(0, 8).map((permissionId) => {
                          const permission = permissions.find(p => p.id === permissionId);
                          return permission ? (
                            <span
                              key={permissionId}
                              className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(permission.category)}`}
                            >
                              {permission.name}
                            </span>
                          ) : null;
                        })}
                        {role.permissions.length > 8 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            +{role.permissions.length - 8} mais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="p-6">
              <div className="grid gap-4">
                {filteredPermissions.map((permission) => (
                  <div key={permission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{permission.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(permission.category)}`}>
                            {permission.category}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getLevelColor(permission.level)}`}>
                            {permission.level}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">{permission.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Recurso: {permission.resource}</span>
                          <span>Ação: {permission.action}</span>
                          <span>Criado em {permission.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      {hasPermission('security:write') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(permission);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Handle delete
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Papel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Atribuído por
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.map((assignment) => {
                      const role = roles.find(r => r.id === assignment.roleId);
                      return (
                        <tr key={assignment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {assignment.userId}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {role && (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                                  style={{ backgroundColor: role.color }}
                                >
                                  {role.icon === 'Crown' && <Crown className="w-3 h-3" />}
                                  {role.icon === 'Star' && <Star className="w-3 h-3" />}
                                  {role.icon === 'Users' && <Users className="w-3 h-3" />}
                                  {role.icon === 'Edit' && <Edit className="w-3 h-3" />}
                                  {role.icon === 'Eye' && <Eye className="w-3 h-3" />}
                                </div>
                                <span className="text-sm text-white">{role.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assignment.assignedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assignment.assignedAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {assignment.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {hasPermission('security:write') && (
                              <div className="flex items-center gap-2">
                                <button className="text-blue-600 hover:text-blue-900">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recurso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permissão
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.slice(0, 20).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {log.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.userId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {log.resource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.permission}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center gap-1 ${getResultColor(log.result)}`}>
                            {getResultIcon(log.result)}
                            <span className="text-sm font-medium capitalize">
                              {log.result === 'granted' ? 'Permitido' : 'Negado'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.timestamp.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RBACSystem;