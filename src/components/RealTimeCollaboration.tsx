import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, MessageCircle, Eye, Edit, Share2, Crown, UserPlus, Settings, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';

// Interfaces
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  cursor?: {
    x: number;
    y: number;
    elementId?: string;
  };
  selection?: {
    start: number;
    end: number;
    elementId: string;
  };
}

interface CollaborationEvent {
  id: string;
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'selection' | 'message' | 'typing';
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

interface LiveMessage {
  id: string;
  content: string;
  authorId: string;
  timestamp: Date;
  type: 'text' | 'system' | 'edit' | 'suggestion';
  replyTo?: string;
  reactions: {
    emoji: string;
    users: string[];
  }[];
}

interface RealTimeCollaborationProps {
  conversationId: string;
  currentUser: User;
  className?: string;
  onUserJoin?: (user: User) => void;
  onUserLeave?: (userId: string) => void;
  onCollaborationEvent?: (event: CollaborationEvent) => void;
}

// Mock WebSocket simulation
class MockWebSocket {
  private listeners: { [key: string]: ((...args: unknown[]) => void)[] } = {};
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    setTimeout(() => {
      this.isConnected = true;
      this.emit('open', {});
      this.reconnectAttempts = 0;
    }, 500);
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event: string, data: Record<string, unknown>) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  send(data: Record<string, unknown>) {
    if (this.isConnected) {
      // Simulate server response
      setTimeout(() => {
        this.emit('message', { type: 'ack', data });
      }, 50);
    }
  }

  close() {
    this.isConnected = false;
    this.emit('close', {});
  }

  getReadyState() {
    return this.isConnected ? 1 : 0; // 1 = OPEN, 0 = CONNECTING
  }
}

// Generate mock users
const generateMockUsers = (currentUserId: string): User[] => {
  const names = ['Ana Silva', 'Carlos Santos', 'Maria Oliveira', 'João Costa', 'Pedro Lima'];
  const roles: User['role'][] = ['editor', 'viewer', 'editor', 'viewer'];
  const statuses: User['status'][] = ['online', 'away', 'online', 'offline'];
  
  return names.slice(0, 4).map((name, i) => ({
    id: `user-${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@empresa.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    role: roles[i],
    status: statuses[i],
    lastSeen: new Date(Date.now() - Math.random() * 3600000),
    cursor: Math.random() > 0.5 ? {
      x: Math.random() * 800,
      y: Math.random() * 600
    } : undefined
  })).filter(user => user.id !== currentUserId);
};

const RealTimeCollaboration: React.FC<RealTimeCollaborationProps> = ({
  conversationId,
  currentUser,
  className,
  onUserJoin,
  onUserLeave,
  onCollaborationEvent
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const wsRef = useRef<MockWebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new MockWebSocket(`ws://localhost:3005/collaboration/${conversationId}`);
    wsRef.current = ws;

    ws.on('open', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Join collaboration session
      ws.send({
        type: 'join',
        user: currentUser,
        conversationId
      });
    });

    ws.on('message', (event: Record<string, unknown>) => {
      handleWebSocketMessage(event);
    });

    ws.on('close', () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    ws.on('error', (error: unknown) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    });

    // Simulate initial users
    setTimeout(() => {
      setUsers(generateMockUsers(currentUser.id));
    }, 1000);

    return () => {
      ws.close();
    };
  }, [conversationId, currentUser]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((event: Record<string, unknown>) => {
    const { type, data, userId } = event;

    switch (type) {
      case 'user_joined':
        setUsers(prev => {
          if (prev.find(u => u.id === data.id)) return prev;
          return [...prev, data];
        });
        onUserJoin?.(data);
        break;

      case 'user_left':
        setUsers(prev => prev.filter(u => u.id !== userId));
        onUserLeave?.(userId);
        break;

      case 'cursor_update':
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, cursor: data.cursor } : u
        ));
        break;

      case 'selection_update':
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, selection: data.selection } : u
        ));
        break;

      case 'message':
        setMessages(prev => [...prev, data]);
        break;

      case 'typing_start':
        setTypingUsers(prev => [...prev.filter(id => id !== userId), userId]);
        break;

      case 'typing_stop':
        setTypingUsers(prev => prev.filter(id => id !== userId));
        break;

      case 'status_update':
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, status: data.status } : u
        ));
        break;
    }

    onCollaborationEvent?.({
      id: `event-${Date.now()}`,
      type: type as any,
      userId,
      timestamp: new Date(),
      data
    });
  }, [onUserJoin, onUserLeave, onCollaborationEvent]);

  // Send message
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !wsRef.current) return;

    const message: LiveMessage = {
      id: `msg-${Date.now()}`,
      content: newMessage,
      authorId: currentUser.id,
      timestamp: new Date(),
      type: 'text',
      reactions: []
    };

    wsRef.current.send({
      type: 'message',
      data: message
    });

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    stopTyping();
  }, [newMessage, currentUser.id]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!wsRef.current) return;

    wsRef.current.send({
      type: 'typing_start',
      userId: currentUser.id
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [currentUser.id]);

  const stopTyping = useCallback(() => {
    if (!wsRef.current) return;

    wsRef.current.send({
      type: 'typing_stop',
      userId: currentUser.id
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentUser.id]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get user by ID
  const getUserById = (id: string) => {
    if (id === currentUser.id) return currentUser;
    return users.find(u => u.id === id);
  };

  // Get status color
  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Get role icon
  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3" />;
      case 'editor': return <Edit className="w-3 h-3" />;
      case 'viewer': return <Eye className="w-3 h-3" />;
      default: return null;
    }
  };

  const onlineUsers = [currentUser, ...users].filter(u => u.status === 'online');
  const totalUsers = users.length + 1; // +1 for current user

  return (
    <div className={cn('space-y-4', className)}>
      {/* Connection Status & Users Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
                )}>
                  {connectionStatus === 'connected' ? 'Conectado' : 
                   connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                </span>
              </div>

              {/* Active Users */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {onlineUsers.length} de {totalUsers} usuários online
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* User Avatars */}
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 5).map(user => (
                  <div key={user.id} className="relative">
                    <div className="w-8 h-8 rounded-full bg-brand-main-blue flex items-center justify-center text-white text-xs font-medium border-2 border-background">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                      getStatusColor(user.status)
                    )} />
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                    +{onlineUsers.length - 5}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserList(!showUserList)}
              >
                <Users className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageCircle className="w-4 h-4" />
                {messages.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                    {messages.length}
                  </span>
                )}
              </Button>
              
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User List */}
        {showUserList && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Colaboradores ({totalUsers})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Current User */}
              <div className="flex items-center gap-3 p-2 bg-primary/5 rounded-lg">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand-main-blue flex items-center justify-center text-white font-medium">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                    getStatusColor(currentUser.status)
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currentUser.name}</span>
                    <span className="text-xs text-primary">(Você)</span>
                    {getRoleIcon(currentUser.role)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              {/* Other Users */}
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                      getStatusColor(user.status)
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.status === 'online' ? 'Online agora' : 
                       user.status === 'away' ? 'Ausente' : 
                       `Visto ${user.lastSeen.toLocaleTimeString()}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Colaborador
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live Chat */}
        {showChat && (
          <Card className={cn(
            'flex flex-col',
            showUserList ? 'lg:col-span-2' : 'lg:col-span-3'
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Chat da Colaboração
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 p-4 space-y-3 max-h-96 overflow-y-auto">
                {messages.map(message => {
                  const author = getUserById(message.authorId);
                  const isCurrentUser = message.authorId === currentUser.id;
                  
                  return (
                    <div key={message.id} className={cn(
                      'flex gap-3',
                      isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                    )}>
                      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {author?.name.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div className={cn(
                        'flex-1 max-w-xs',
                        isCurrentUser ? 'text-right' : 'text-left'
                      )}>
                        <div className="text-xs text-muted-foreground mb-1">
                          {author?.name || 'Usuário Desconhecido'} • {message.timestamp.toLocaleTimeString()}
                        </div>
                        <div className={cn(
                          'p-3 rounded-lg text-sm',
                          isCurrentUser 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        )}>
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span>
                      {typingUsers.map(id => getUserById(id)?.name).filter(Boolean).join(', ')} 
                      {typingUsers.length === 1 ? 'está digitando...' : 'estão digitando...'}
                    </span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma mensagem..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !isConnected}
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cursor Overlays */}
      {users.map(user => {
        if (!user.cursor || user.status !== 'online') return null;
        
        return (
          <div
            key={`cursor-${user.id}`}
            className="fixed pointer-events-none z-50"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-brand-main-blue rounded-full" />
              <div className="px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap">
                {user.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RealTimeCollaboration;