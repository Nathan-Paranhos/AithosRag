import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Upload, Trash2, Star, Clock, Filter, Tag, Share2, Archive } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { SearchInput } from './ui/Input';
import { cn } from '../utils/cn';

// Interfaces
interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isStarred: boolean;
  isArchived: boolean;
  summary?: string;
  tokenCount: number;
  model: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
}

interface HistoryFilters {
  search: string;
  tags: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  starred: boolean;
  archived: boolean;
  model?: string;
}

interface AIHistoryManagerProps {
  className?: string;
  onConversationSelect?: (conversation: AIConversation) => void;
  onConversationDelete?: (conversationId: string) => void;
  onExport?: (conversations: AIConversation[]) => void;
  onImport?: (file: File) => void;
}

// Mock data generator
const generateMockConversations = (): AIConversation[] => {
  const models = ['GPT-4', 'Claude-3', 'Gemini-Pro'];
  const tags = ['trabalho', 'pesquisa', 'código', 'criativo', 'análise', 'suporte'];
  
  return Array.from({ length: 15 }, (_, i) => ({
    id: `conv-${i + 1}`,
    title: [
      'Análise de Dados de Vendas Q4',
      'Implementação de Sistema RAG',
      'Estratégia de Marketing Digital',
      'Otimização de Performance React',
      'Pesquisa sobre IA Generativa',
      'Desenvolvimento de API REST',
      'Análise Competitiva de Mercado',
      'Arquitetura de Microservices',
      'Design System Components',
      'Automação de Testes E2E',
      'Estratégia de SEO Avançado',
      'Machine Learning Pipeline',
      'Database Optimization',
      'Security Best Practices',
      'User Experience Research'
    ][i],
    messages: Array.from({ length: Math.floor(Math.random() * 10) + 3 }, (_, j) => ({
      id: `msg-${i}-${j}`,
      role: j % 2 === 0 ? 'user' : 'assistant',
      content: j % 2 === 0 
        ? `Pergunta do usuário ${j + 1} sobre o tópico...`
        : `Resposta detalhada da IA sobre ${j + 1}...`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      metadata: {
        model: models[Math.floor(Math.random() * models.length)],
        tokens: Math.floor(Math.random() * 1000) + 100,
        processingTime: Math.random() * 2000 + 500
      }
    })),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
    isStarred: Math.random() > 0.7,
    isArchived: Math.random() > 0.8,
    summary: `Resumo da conversa sobre ${['análise', 'implementação', 'estratégia', 'otimização'][Math.floor(Math.random() * 4)]}...`,
    tokenCount: Math.floor(Math.random() * 5000) + 1000,
    model: models[Math.floor(Math.random() * models.length)]
  }));
};

const AIHistoryManager: React.FC<AIHistoryManagerProps> = ({
  className,
  onConversationSelect,
  onConversationDelete,
  onExport,
  onImport
}) => {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [filters, setFilters] = useState<HistoryFilters>({
    search: '',
    tags: [],
    dateRange: {},
    starred: false,
    archived: false
  });
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [sortBy] = useState<'date' | 'title' | 'tokens'>('date');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  // Load conversations on mount
  useEffect(() => {
    setConversations(generateMockConversations());
  }, []);

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter(conv => {
      // Search filter
      if (filters.search && !conv.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !conv.summary?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => conv.tags.includes(tag))) {
        return false;
      }

      // Starred filter
      if (filters.starred && !conv.isStarred) {
        return false;
      }

      // Archived filter
      if (filters.archived !== conv.isArchived) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start && conv.createdAt < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && conv.createdAt > filters.dateRange.end) {
        return false;
      }

      // Model filter
      if (filters.model && conv.model !== filters.model) {
        return false;
      }

      return true;
    });

    // Sort conversations
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'tokens':
          comparison = a.tokenCount - b.tokenCount;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [conversations, filters, sortBy, sortOrder]);

  // Get unique tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    conversations.forEach(conv => {
      conv.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [conversations]);

  // Handle conversation actions
  const handleStarToggle = (conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, isStarred: !conv.isStarred }
        : conv
    ));
  };

  const handleArchiveToggle = (conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, isArchived: !conv.isArchived }
        : conv
    ));
  };

  const handleDelete = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    onConversationDelete?.(conversationId);
  };

  const handleBulkAction = (action: 'delete' | 'archive' | 'star' | 'export') => {
    const selected = conversations.filter(conv => selectedConversations.includes(conv.id));
    
    switch (action) {
      case 'delete':
        setConversations(prev => prev.filter(conv => !selectedConversations.includes(conv.id)));
        break;
      case 'archive':
        setConversations(prev => prev.map(conv => 
          selectedConversations.includes(conv.id)
            ? { ...conv, isArchived: true }
            : conv
        ));
        break;
      case 'star':
        setConversations(prev => prev.map(conv => 
          selectedConversations.includes(conv.id)
            ? { ...conv, isStarred: true }
            : conv
        ));
        break;
      case 'export':
        onExport?.(selected);
        break;
    }
    
    setSelectedConversations([]);
  };

  const handleExportAll = () => {
    const dataStr = JSON.stringify(filteredConversations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aithos-conversations-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport?.(file);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Histórico de Conversas</h2>
          <p className="text-muted-foreground">
            {filteredConversations.length} de {conversations.length} conversas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          
          <label className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              asChild
            >
              <span>
                <Upload className="w-4 h-4" />
                Importar
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <SearchInput
            placeholder="Buscar conversas..."
            value={filters.search}
            onChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
            className="w-full"
          />
          
          {/* Filter options */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="starred"
                checked={filters.starred}
                onChange={(e) => setFilters(prev => ({ ...prev, starred: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="starred" className="text-sm font-medium flex items-center gap-1">
                <Star className="w-4 h-4" />
                Favoritas
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="archived"
                checked={filters.archived}
                onChange={(e) => setFilters(prev => ({ ...prev, archived: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="archived" className="text-sm font-medium flex items-center gap-1">
                <Archive className="w-4 h-4" />
                Arquivadas
              </label>
            </div>
          </div>
          
          {/* Tags filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags:</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      tags: prev.tags.includes(tag)
                        ? prev.tags.filter(t => t !== tag)
                        : [...prev.tags, tag]
                    }));
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    filters.tags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  <Tag className="w-3 h-3 mr-1 inline" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedConversations.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedConversations.length} conversas selecionadas
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('star')}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Favoritar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('archive')}
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Arquivar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export')}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversations list */}
      <div className="space-y-4">
        {filteredConversations.map(conversation => (
          <Card
            key={conversation.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              selectedConversations.includes(conversation.id) && 'ring-2 ring-primary'
            )}
            onClick={() => onConversationSelect?.(conversation)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedConversations.includes(conversation.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedConversations(prev => 
                        e.target.checked
                          ? [...prev, conversation.id]
                          : prev.filter(id => id !== conversation.id)
                      );
                    }}
                    className="mt-1 rounded border-gray-300"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {conversation.title}
                      </h3>
                      {conversation.isStarred && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {conversation.isArchived && (
                        <Archive className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {conversation.summary}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {conversation.updatedAt.toLocaleDateString()}
                      </span>
                      <span>{conversation.messages.length} mensagens</span>
                      <span>{conversation.tokenCount.toLocaleString()} tokens</span>
                      <span className="px-2 py-1 bg-secondary rounded text-xs">
                        {conversation.model}
                      </span>
                    </div>
                    
                    <div className="flex gap-1 mt-2">
                      {conversation.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStarToggle(conversation.id);
                    }}
                  >
                    <Star className={cn(
                      'w-4 h-4',
                      conversation.isStarred ? 'text-yellow-500 fill-current' : 'text-gray-400'
                    )} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveToggle(conversation.id);
                    }}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Share functionality
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conversation.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredConversations.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma conversa encontrada</h3>
                <p className="text-sm">
                  Tente ajustar os filtros ou criar uma nova conversa.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AIHistoryManager;