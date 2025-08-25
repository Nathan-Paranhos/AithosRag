import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter, X, Clock, Tag, User, Calendar, Zap, Brain, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';

// Interfaces
interface SearchResult {
  id: string;
  type: 'conversation' | 'message' | 'document' | 'code' | 'insight';
  title: string;
  content: string;
  snippet: string;
  relevanceScore: number;
  timestamp: Date;
  tags: string[];
  metadata: {
    author?: string;
    model?: string;
    tokens?: number;
    language?: string;
    category?: string;
  };
  highlights: string[];
}

interface SearchFilters {
  types: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  tags: string[];
  authors: string[];
  models: string[];
  minRelevance: number;
  sortBy: 'relevance' | 'date' | 'title';
  sortOrder: 'asc' | 'desc';
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'filter' | 'tag' | 'recent';
  count?: number;
  icon?: React.ReactNode;
}

interface AdvancedSearchProps {
  className?: string;
  onResultSelect?: (result: SearchResult) => void;
  onSearchChange?: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
}

// Mock data generators
const generateMockResults = (query: string): SearchResult[] => {
  const types = ['conversation', 'message', 'document', 'code', 'insight'] as const;
  const models = ['GPT-4', 'Claude-3', 'Gemini-Pro', 'Llama-2'];
  const authors = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira'];
  const tags = ['IA', 'desenvolvimento', 'análise', 'estratégia', 'código', 'pesquisa'];
  const languages = ['JavaScript', 'Python', 'TypeScript', 'SQL', 'Markdown'];
  
  return Array.from({ length: 12 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      id: `result-${i + 1}`,
      type,
      title: [
        `Implementação de ${query} em React`,
        `Análise de ${query} com IA`,
        `Estratégia de ${query} para 2024`,
        `Otimização de ${query} em produção`,
        `Pesquisa sobre ${query} avançado`,
        `Tutorial de ${query} completo`,
        `Comparação de ${query} vs alternativas`,
        `Melhores práticas de ${query}`,
        `Arquitetura de ${query} escalável`,
        `Debugging de ${query} complexo`,
        `Performance de ${query} otimizada`,
        `Segurança em ${query} enterprise`
      ][i],
      content: `Conteúdo detalhado sobre ${query} que inclui implementação, análise e melhores práticas...`,
      snippet: `Este é um trecho relevante que menciona ${query} e suas aplicações práticas no contexto empresarial...`,
      relevanceScore: Math.random() * 100,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
      metadata: {
        author: authors[Math.floor(Math.random() * authors.length)],
        model: type === 'conversation' || type === 'message' ? models[Math.floor(Math.random() * models.length)] : undefined,
        tokens: type === 'conversation' || type === 'message' ? Math.floor(Math.random() * 2000) + 100 : undefined,
        language: type === 'code' ? languages[Math.floor(Math.random() * languages.length)] : undefined,
        category: ['Técnico', 'Estratégico', 'Operacional', 'Criativo'][Math.floor(Math.random() * 4)]
      },
      highlights: [
        `...implementação de ${query} com...`,
        `...análise detalhada do ${query}...`,
        `...otimização do ${query} para...`
      ]
    };
  });
};

const generateSearchSuggestions = (query: string): SearchSuggestion[] => {
  const suggestions: SearchSuggestion[] = [];
  
  // Query suggestions
  if (query.length > 0) {
    const querySuggestions = [
      `${query} implementação`,
      `${query} tutorial`,
      `${query} melhores práticas`,
      `${query} vs alternativas`,
      `${query} performance`
    ];
    
    querySuggestions.forEach((suggestion, i) => {
      suggestions.push({
        id: `query-${i}`,
        text: suggestion,
        type: 'query',
        count: Math.floor(Math.random() * 50) + 5,
        icon: <Search className="w-4 h-4" />
      });
    });
  }
  
  // Recent searches
  const recentSearches = [
    'React hooks avançados',
    'Machine Learning pipeline',
    'Microservices architecture',
    'Database optimization',
    'Security best practices'
  ];
  
  recentSearches.forEach((search, i) => {
    suggestions.push({
      id: `recent-${i}`,
      text: search,
      type: 'recent',
      icon: <Clock className="w-4 h-4" />
    });
  });
  
  // Tag suggestions
  const tagSuggestions = ['IA', 'desenvolvimento', 'análise', 'estratégia'];
  tagSuggestions.forEach((tag, i) => {
    suggestions.push({
      id: `tag-${i}`,
      text: `tag:${tag}`,
      type: 'tag',
      count: Math.floor(Math.random() * 100) + 10,
      icon: <Tag className="w-4 h-4" />
    });
  });
  
  return suggestions.slice(0, 8);
};

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  className,
  onResultSelect,
  onSearchChange,
  placeholder = "Buscar conversas, documentos, código...",
  showFilters = true
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    dateRange: {},
    tags: [],
    authors: [],
    models: [],
    minRelevance: 0,
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        setIsSearching(true);
        // Simulate API call
        setTimeout(() => {
          setResults(generateMockResults(query));
          setIsSearching(false);
        }, 300);
      } else {
        setResults([]);
      }
      onSearchChange?.(query, filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters, onSearchChange]);

  // Generate suggestions
  useEffect(() => {
    setSuggestions(generateSearchSuggestions(query));
  }, [query]);

  // Filter results
  const filteredResults = useMemo(() => {
    const filtered = results.filter(result => {
      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(result.type)) {
        return false;
      }
      
      // Date range filter
      if (filters.dateRange.start && result.timestamp < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && result.timestamp > filters.dateRange.end) {
        return false;
      }
      
      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some(tag => result.tags.includes(tag))) {
        return false;
      }
      
      // Authors filter
      if (filters.authors.length > 0 && result.metadata.author && !filters.authors.includes(result.metadata.author)) {
        return false;
      }
      
      // Models filter
      if (filters.models.length > 0 && result.metadata.model && !filters.models.includes(result.metadata.model)) {
        return false;
      }
      
      // Relevance filter
      if (result.relevanceScore < filters.minRelevance) {
        return false;
      }
      
      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'date':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [results, filters]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          handleSuggestionSelect(suggestions[selectedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        break;
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    searchRef.current?.focus();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conversation': return <Brain className="w-4 h-4" />;
      case 'message': return <Zap className="w-4 h-4" />;
      case 'document': return <Search className="w-4 h-4" />;
      case 'code': return <Sparkles className="w-4 h-4" />;
      case 'insight': return <Filter className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'conversation': return 'text-blue-600 bg-blue-50';
      case 'message': return 'text-green-600 bg-green-50';
      case 'document': return 'text-purple-600 bg-purple-50';
      case 'code': return 'text-orange-600 bg-orange-50';
      case 'insight': return 'text-pink-600 bg-pink-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={searchRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow suggestion clicks
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4 py-3 text-lg"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('');
                setResults([]);
                searchRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
            <CardContent className="p-0">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3',
                    index === selectedSuggestion && 'bg-muted'
                  )}
                >
                  <span className="text-muted-foreground">
                    {suggestion.icon}
                  </span>
                  <span className="flex-1">{suggestion.text}</span>
                  {suggestion.count && (
                    <span className="text-xs text-muted-foreground">
                      {suggestion.count} resultados
                    </span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipos de Conteúdo:</label>
              <div className="flex flex-wrap gap-2">
                {['conversation', 'message', 'document', 'code', 'insight'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        types: prev.types.includes(type)
                          ? prev.types.filter(t => t !== type)
                          : [...prev.types, type]
                      }));
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
                      filters.types.includes(type)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {getTypeIcon(type)}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort options */}
            <div className="flex gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ordenar por:</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'relevance' | 'date' | 'title' }))}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="relevance">Relevância</option>
                  <option value="date">Data</option>
                  <option value="title">Título</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Ordem:</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="desc">Decrescente</option>
                  <option value="asc">Crescente</option>
                </select>
              </div>
            </div>

            {/* Relevance filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Relevância mínima: {filters.minRelevance}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minRelevance}
                onChange={(e) => setFilters(prev => ({ ...prev, minRelevance: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {query && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {isSearching ? 'Buscando...' : `${filteredResults.length} resultados encontrados`}
            </h3>
            {filteredResults.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Busca por "{query}"
              </div>
            )}
          </div>

          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map(result => (
                <Card
                  key={result.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => onResultSelect?.(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        getTypeColor(result.type)
                      )}>
                        {getTypeIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">
                            {result.title}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(result.relevanceScore)}% relevante
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {result.snippet}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {result.timestamp.toLocaleDateString()}
                          </span>
                          {result.metadata.author && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {result.metadata.author}
                            </span>
                          )}
                          {result.metadata.model && (
                            <span className="px-2 py-1 bg-secondary rounded text-xs">
                              {result.metadata.model}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          {result.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {result.highlights.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Trechos relevantes:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {result.highlights.slice(0, 2).map((highlight, i) => (
                                <li key={i}>{highlight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredResults.length === 0 && !isSearching && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
                    <p className="text-sm text-muted-foreground">
                      Tente ajustar sua busca ou filtros.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;