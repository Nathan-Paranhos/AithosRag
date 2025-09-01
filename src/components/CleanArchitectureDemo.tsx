// Clean Architecture Demo Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Users,
  Shield,
  FileText,
  Activity,
  Database,
  Settings,
  Zap,
  Brain
} from 'lucide-react';
import { useCleanArchitecture } from '../hooks/useCleanArchitecture';
import { ChatConfig } from '../domain/entities/Message';

interface CleanArchitectureDemoProps {
  userId?: string;
}

const CleanArchitectureDemo: React.FC<CleanArchitectureDemoProps> = ({ userId = 'demo-user' }) => {
  const {
    // State
    isLoading,
    error,
    healthStatus,
    
    // Actions
    sendMessage,
    createSession,
    getSessions,
    getMessages,
    deleteSession,
    searchMessages,
    
    // Analytics
    trackEvent,
    trackUserAction,
    
    // Security
    sanitizeInput,
    checkRateLimit,
    
    // File Operations
    uploadFile,
    
    // Notifications
    showSuccess,
    showError,
    showInfo,
    
    // Health Check
    checkHealth
  } = useCleanArchitecture(userId);

  // Local state for demo
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [rateLimitTest, setRateLimitTest] = useState<boolean | null>(null);
  const [sanitizedText, setSanitizedText] = useState('');
  const [testInput, setTestInput] = useState('<script>alert("xss")</script>Hello World!');

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-sanitize test input
  useEffect(() => {
    setSanitizedText(sanitizeInput(testInput));
  }, [testInput, sanitizeInput]);

  const loadSessions = async () => {
    const sessionList = await getSessions();
    setSessions(sessionList);
  };

  const loadMessages = async (sessionId: string) => {
    const messageList = await getMessages(sessionId);
    setMessages(messageList);
    setSelectedSessionId(sessionId);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    const config: ChatConfig = {
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      maxTokens: 1000
    };
    
    const message = await sendMessage(messageInput, config);
    if (message) {
      setMessageInput('');
      await showSuccess('Mensagem enviada com sucesso!');
      if (selectedSessionId) {
        await loadMessages(selectedSessionId);
      }
    }
  };

  const handleCreateSession = async () => {
    if (!sessionTitle.trim()) return;
    
    const session = await createSession(sessionTitle, {
      model: 'llama-3.1-8b-instant',
      temperature: 0.7
    });
    
    if (session) {
      setSessionTitle('');
      await loadSessions();
      await showSuccess('Sessão criada com sucesso!');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const success = await deleteSession(sessionId);
    if (success) {
      await loadSessions();
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setMessages([]);
      }
      await showSuccess('Sessão deletada com sucesso!');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await searchMessages(searchQuery, selectedSessionId || undefined);
    setSearchResults(results);
    await trackEvent('search_performed', { query: searchQuery, resultsCount: results.length });
  };

  const handleRateLimitTest = async () => {
    const canProceed = await checkRateLimit('test-user', 5, 60000);
    setRateLimitTest(canProceed);
    await trackEvent('rate_limit_tested', { result: canProceed });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileId = await uploadFile(file, {
      onProgress: (progress) => {
        console.log('Upload progress:', progress);
      }
    });
    
    if (fileId) {
      await showSuccess(`Arquivo ${file.name} enviado com sucesso!`);
    }
  };

  const getHealthStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getHealthStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? 'default' : 'destructive'}>
        {status ? 'Healthy' : 'Unhealthy'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-blue-500" />
          Clean Architecture Demo
        </h1>
        <p className="text-muted-foreground">
          Demonstração da arquitetura limpa com padrões de design
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Gerenciar Sessões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Título da sessão"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                  />
                  <Button onClick={handleCreateSession} disabled={isLoading}>
                    Criar
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{session.title}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadMessages(session.id)}
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          Deletar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Message Sending */}
            <Card>
              <CardHeader>
                <CardTitle>Enviar Mensagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !selectedSessionId}>
                  {isLoading ? 'Enviando...' : 'Enviar Mensagem'}
                </Button>
                {!selectedSessionId && (
                  <p className="text-sm text-muted-foreground">
                    Selecione uma sessão para enviar mensagens
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Messages Display */}
          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mensagens da Sessão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className="p-3 border rounded">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                          {message.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Buscar Mensagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar mensagens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                  Buscar
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div key={result.id} className="p-2 border rounded text-sm">
                      <Badge variant="outline" className="mb-1">
                        {result.role}
                      </Badge>
                      <p>{result.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Sanitization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Sanitização de Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Input Original:</label>
                  <Textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Input Sanitizado:</label>
                  <div className="p-3 bg-muted rounded border">
                    <code className="text-sm">{sanitizedText}</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleRateLimitTest} disabled={isLoading}>
                  Testar Rate Limit
                </Button>
                {rateLimitTest !== null && (
                  <div className="flex items-center gap-2">
                    {getHealthStatusIcon(rateLimitTest)}
                    <span className="text-sm">
                      {rateLimitTest ? 'Permitido' : 'Rate limit atingido'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Analytics & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => trackEvent('button_clicked', { button: 'demo' })}
                >
                  Track Event
                </Button>
                <Button
                  variant="outline"
                  onClick={() => trackUserAction('demo_action', { timestamp: Date.now() })}
                >
                  Track Action
                </Button>
                <Button
                  variant="outline"
                  onClick={() => showInfo('Analytics event tracked!')}
                >
                  Show Info
                </Button>
                <Button
                  variant="outline"
                  onClick={() => showSuccess('Success notification!')}
                >
                  Show Success
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gerenciamento de Arquivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Upload de Arquivo:
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Status dos repositórios e serviços
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={checkHealth} disabled={isLoading}>
                  {isLoading ? 'Verificando...' : 'Verificar Saúde'}
                </Button>
                
                {healthStatus && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status Geral:</span>
                      {getHealthStatusBadge(healthStatus.overall)}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Repositórios:</h4>
                      <div className="space-y-1">
                        {Object.entries(healthStatus.repositories).map(([name, status]) => (
                          <div key={name} className="flex items-center justify-between text-sm">
                            <span>{name}:</span>
                            <div className="flex items-center gap-1">
                              {getHealthStatusIcon(status)}
                              <span>{status ? 'OK' : 'Error'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Serviços:</h4>
                      <div className="space-y-1">
                        {Object.entries(healthStatus.services).map(([name, status]) => (
                          <div key={name} className="flex items-center justify-between text-sm">
                            <span>{name}:</span>
                            <div className="flex items-center gap-1">
                              {getHealthStatusIcon(status)}
                              <span>{status ? 'OK' : 'Error'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sessões Ativas:</span>
                    <span>{sessions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mensagens Carregadas:</span>
                    <span>{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resultados de Busca:</span>
                    <span>{searchResults.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status de Loading:</span>
                    <span>{isLoading ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="architecture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Arquitetura do Sistema
              </CardTitle>
              <CardDescription>
                Visão geral da Clean Architecture implementada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-blue-600 mb-2">Domain Layer</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Entities</li>
                      <li>• Repository Interfaces</li>
                      <li>• Business Rules</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-green-600 mb-2">Application Layer</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Use Cases</li>
                      <li>• Service Interfaces</li>
                      <li>• Business Logic</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-orange-600 mb-2">Infrastructure Layer</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Repository Implementations</li>
                      <li>• External Services</li>
                      <li>• Data Access</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-purple-600 mb-2">Presentation Layer</h4>
                    <ul className="text-sm space-y-1">
                      <li>• React Components</li>
                      <li>• Custom Hooks</li>
                      <li>• UI Logic</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Design Patterns Implementados:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <Badge variant="outline">Repository Pattern</Badge>
                    <Badge variant="outline">Factory Pattern</Badge>
                    <Badge variant="outline">Dependency Injection</Badge>
                    <Badge variant="outline">Observer Pattern</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CleanArchitectureDemo;