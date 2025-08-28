import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Star,
  User,
  Bot,
  Calendar,
  Share2,
  Archive
} from 'lucide-react';

// Types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
  tokens?: number;
  duration?: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  starred: boolean;
  archived: boolean;
  model: string;
  totalTokens: number;
  totalMessages: number;
}

interface ConversationFilter {
  search: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  tags: string[];
  models: string[];
  starred: boolean | null;
  archived: boolean | null;
}

// Mock data
const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Análise de Performance do Sistema',
    messages: [
      {
        id: '1-1',
        content: 'Como posso melhorar a performance do meu sistema?',
        role: 'user',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: '1-2',
        content: 'Existem várias estratégias para melhorar a performance...',
        role: 'assistant',
        timestamp: new Date(Date.now() - 3590000),
        model: 'llama-3.1-70b-versatile',
        tokens: 245,
        duration: 1200
      }
    ],
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3590000),
    tags: ['performance', 'otimização', 'sistema'],
    starred: true,
    archived: false,
    model: 'llama-3.1-70b-versatile',
    totalTokens: 245,
    totalMessages: 2
  },
  {
    id: '2',
    title: 'Implementação de Microserviços',
    messages: [
      {
        id: '2-1',
        content: 'Quais são as melhores práticas para microserviços?',
        role: 'user',
        timestamp: new Date(Date.now() - 7200000),
      },
      {
        id: '2-2',
        content: 'Os microserviços oferecem várias vantagens...',
        role: 'assistant',
        timestamp: new Date(Date.now() - 7190000),
        model: 'mixtral-8x7b-32768',
        tokens: 312,
        duration: 1800
      }
    ],
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7190000),
    tags: ['arquitetura', 'microserviços', 'backend'],
    starred: false,
    archived: false,
    model: 'mixtral-8x7b-32768',
    totalTokens: 312,
    totalMessages: 2
  },
  {
    id: '3',
    title: 'Segurança em APIs REST',
    messages: [
      {
        id: '3-1',
        content: 'Como implementar autenticação JWT?',
        role: 'user',
        timestamp: new Date(Date.now() - 10800000),
      },
      {
        id: '3-2',
        content: 'JWT (JSON Web Tokens) é uma excelente escolha...',
        role: 'assistant',
        timestamp: new Date(Date.now() - 10790000),
        model: 'gemma2-9b-it',
        tokens: 189,
        duration: 950
      }
    ],
    createdAt: new Date(Date.now() - 10800000),
    updatedAt: new Date(Date.now() - 10790000),
    tags: ['segurança', 'jwt', 'api', 'autenticação'],
    starred: true,
    archived: false,
    model: 'gemma2-9b-it',
    totalTokens: 189,
    totalMessages: 2
  }
];

const availableTags = ['performance', 'otimização', 'sistema', 'arquitetura', 'microserviços', 'backend', 'segurança', 'jwt', 'api', 'autenticação'];
const availableModels = ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'llama-3.1-8b-instant', 'llama3-groq-70b-8192-tool-use-preview'];

const ConversationHistory: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>({
    search: '',
    dateRange: { start: null, end: null },
    tags: [],
    models: [],
    starred: null,
    archived: null
  });
  const [showFilters, setShowFilters] = useState(false);
  // const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Future use for grid/list view toggle

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Search filter
      if (filter.search && !conv.title.toLowerCase().includes(filter.search.toLowerCase()) &&
          !conv.messages.some(msg => msg.content.toLowerCase().includes(filter.search.toLowerCase()))) {
        return false;
      }

      // Date range filter
      if (filter.dateRange.start && conv.createdAt < filter.dateRange.start) return false;
      if (filter.dateRange.end && conv.createdAt > filter.dateRange.end) return false;

      // Tags filter
      if (filter.tags.length > 0 && !filter.tags.some(tag => conv.tags.includes(tag))) return false;

      // Models filter
      if (filter.models.length > 0 && !filter.models.includes(conv.model)) return false;

      // Starred filter
      if (filter.starred !== null && conv.starred !== filter.starred) return false;

      // Archived filter
      if (filter.archived !== null && conv.archived !== filter.archived) return false;

      return true;
    });
  }, [conversations, filter]);

  // Statistics
  const stats = useMemo(() => {
    const total = conversations.length;
    const starred = conversations.filter(c => c.starred).length;
    const archived = conversations.filter(c => c.archived).length;
    const totalTokens = conversations.reduce((sum, c) => sum + c.totalTokens, 0);
    const totalMessages = conversations.reduce((sum, c) => sum + c.totalMessages, 0);

    return { total, starred, archived, totalTokens, totalMessages };
  }, [conversations]);

  // Event handlers
  const handleStarConversation = (id: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, starred: !conv.starred } : conv
    ));
  };

  const handleArchiveConversation = (id: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, archived: !conv.archived } : conv
    ));
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (selectedConversation?.id === id) {
      setSelectedConversation(null);
    }
  };

  const handleExportConversations = () => {
    const dataStr = JSON.stringify(filteredConversations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportConversations = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConversations = JSON.parse(e.target?.result as string);
          setConversations(prev => [...prev, ...importedConversations]);
        } catch (error) {
          console.error('Erro ao importar conversas:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Histórico de Conversas</h1>
            <p className="text-gray-600">Gerencie e analise suas conversas com IA</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportConversations}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            
            <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Importar
              <input
                type="file"
                accept=".json"
                onChange={handleImportConversations}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">Total</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.starred}</div>
            <div className="text-sm text-yellow-600">Favoritas</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
            <div className="text-sm text-gray-600">Arquivadas</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.totalTokens.toLocaleString()}</div>
            <div className="text-sm text-green-600">Tokens</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.totalMessages}</div>
            <div className="text-sm text-purple-600">Mensagens</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
        
        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filter.dateRange.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilter(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value ? new Date(e.target.value) : null }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="date"
                    value={filter.dateRange.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilter(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value ? new Date(e.target.value) : null }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <select
                  multiple
                  value={filter.tags}
                  onChange={(e) => setFilter(prev => ({
                    ...prev,
                    tags: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  size={3}
                >
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              
              {/* Models */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modelos</label>
                <select
                  multiple
                  value={filter.models}
                  onChange={(e) => setFilter(prev => ({
                    ...prev,
                    models: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  size={3}
                >
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.starred === true}
                      onChange={(e) => setFilter(prev => ({
                        ...prev,
                        starred: e.target.checked ? true : null
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Favoritas</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.archived === true}
                      onChange={(e) => setFilter(prev => ({
                        ...prev,
                        archived: e.target.checked ? true : null
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Arquivadas</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setFilter({
                  search: '',
                  dateRange: { start: null, end: null },
                  tags: [],
                  models: [],
                  starred: null,
                  archived: null
                })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">
                Conversas ({filteredConversations.length})
              </h3>
            </div>
            
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedConversation?.id === conversation.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-white truncate flex-1 mr-2">
                      {conversation.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      {conversation.starred && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {conversation.archived && (
                        <Archive className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {conversation.messages[conversation.messages.length - 1]?.content.substring(0, 100)}...
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(conversation.updatedAt)}</span>
                    <div className="flex items-center gap-2">
                      <span>{conversation.totalMessages} msgs</span>
                      <span>{conversation.totalTokens} tokens</span>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {conversation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {conversation.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {conversation.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          +{conversation.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="flex-1 bg-white">
          {selectedConversation ? (
            <div className="h-full flex flex-col">
              {/* Conversation Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-2">
                      {selectedConversation.title}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedConversation.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Bot className="w-4 h-4" />
                        {selectedConversation.model}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {selectedConversation.totalMessages} mensagens
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStarConversation(selectedConversation.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        selectedConversation.starred
                          ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                          : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${selectedConversation.starred ? 'fill-current' : ''}`} />
                    </button>
                    
                    <button
                      onClick={() => handleArchiveConversation(selectedConversation.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                    
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteConversation(selectedConversation.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Tags */}
                {selectedConversation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedConversation.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        <Tag className="w-3 h-3 inline mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      
                      <div className={`max-w-3xl ${
                        message.role === 'user' ? 'order-1' : ''
                      }`}>
                        <div className={`p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-white'
                        }`}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          
                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                              {message.model && (
                                <span>Modelo: {message.model}</span>
                              )}
                              {message.tokens && (
                                <span>Tokens: {message.tokens}</span>
                              )}
                              {message.duration && (
                                <span>Tempo: {formatDuration(message.duration)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-xs text-gray-500 mt-1 ${
                          message.role === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {formatDate(message.timestamp)}
                        </div>
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-gray-600">
                  Escolha uma conversa da lista para visualizar os detalhes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHistory;