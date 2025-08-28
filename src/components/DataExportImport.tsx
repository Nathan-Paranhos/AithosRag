import React, { useState, useRef, useCallback } from 'react';
import { Download, Upload, FileText, Database, Settings, History, Users, Shield, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { cn } from '../utils/cn';

// Interfaces
interface ExportData {
  version: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    preferences: Record<string, unknown>;
  };
  conversations: Array<{
    id: string;
    title: string;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      metadata?: Record<string, unknown>;
    }>;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    category: string;
  }>;
  settings: {
    theme: string;
    language: string;
    voiceSettings: Record<string, unknown>;
    aiPreferences: Record<string, unknown>;
    notifications: Record<string, unknown>;
  };
  documents: Array<{
    id: string;
    name: string;
    content: string;
    type: string;
    size: number;
    uploadedAt: string;
    tags: string[];
  }>;
  analytics: {
    totalConversations: number;
    totalMessages: number;
    averageSessionTime: number;
    mostUsedFeatures: string[];
    usageByDate: Record<string, number>;
  };
}

interface ExportOptions {
  includeConversations: boolean;
  includeSettings: boolean;
  includeDocuments: boolean;
  includeAnalytics: boolean;
  includeUserData: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  format: 'json' | 'csv' | 'xml' | 'pdf';
  compression: boolean;
  encryption: boolean;
  password?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    conversations: number;
    documents: number;
    settings: number;
  };
  errors: string[];
  warnings: string[];
}

interface DataExportImportProps {
  className?: string;
  onExport?: (data: ExportData) => void;
  onImport?: (data: ExportData) => Promise<ImportResult>;
  onError?: (error: string) => void;
}

const DataExportImport: React.FC<DataExportImportProps> = ({
  className,
  onExport,
  onImport,
  onError
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeConversations: true,
    includeSettings: true,
    includeDocuments: true,
    includeAnalytics: false,
    includeUserData: false,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    format: 'json',
    compression: false,
    encryption: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Partial<ExportData> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data generator
  const generateMockData = useCallback((): ExportData => {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      timestamp: now,
      user: {
        id: 'user-123',
        name: 'João Silva',
        email: 'joao@example.com',
        preferences: {
          theme: 'dark',
          language: 'pt-BR',
          notifications: true
        }
      },
      conversations: [
        {
          id: 'conv-1',
          title: 'Discussão sobre IA',
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'Como funciona o machine learning?',
              timestamp: now
            },
            {
              id: 'msg-2',
              role: 'assistant',
              content: 'Machine learning é um subcampo da inteligência artificial...',
              timestamp: now
            }
          ],
          createdAt: now,
          updatedAt: now,
          tags: ['IA', 'Educação'],
          category: 'Tecnologia'
        },
        {
          id: 'conv-2',
          title: 'Planejamento de Projeto',
          messages: [
            {
              id: 'msg-3',
              role: 'user',
              content: 'Preciso de ajuda para planejar um projeto de software',
              timestamp: now
            }
          ],
          createdAt: now,
          updatedAt: now,
          tags: ['Projeto', 'Planejamento'],
          category: 'Trabalho'
        }
      ],
      settings: {
        theme: 'dark',
        language: 'pt-BR',
        voiceSettings: {
          rate: 1.0,
          pitch: 1.0,
          volume: 0.8
        },
        aiPreferences: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2048
        },
        notifications: {
          email: true,
          push: false,
          sound: true
        }
      },
      documents: [
        {
          id: 'doc-1',
          name: 'Manual do Usuário.pdf',
          content: 'Conteúdo do documento...',
          type: 'pdf',
          size: 1024000,
          uploadedAt: now,
          tags: ['Manual', 'Documentação']
        }
      ],
      analytics: {
        totalConversations: 25,
        totalMessages: 150,
        averageSessionTime: 1200,
        mostUsedFeatures: ['Chat', 'Voice', 'Export'],
        usageByDate: {
          '2024-01-01': 5,
          '2024-01-02': 8,
          '2024-01-03': 12
        }
      }
    };
  }, []);

  // Export functionality
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = generateMockData();
      
      // Filter data based on options
      const filteredData: Partial<ExportData> = {
        version: data.version,
        timestamp: data.timestamp
      };

      if (exportOptions.includeUserData) {
        filteredData.user = data.user;
      }

      if (exportOptions.includeConversations) {
        // Filter by date range
        const startDate = new Date(exportOptions.dateRange.start);
        const endDate = new Date(exportOptions.dateRange.end);
        
        filteredData.conversations = data.conversations.filter(conv => {
          const convDate = new Date(conv.createdAt);
          return convDate >= startDate && convDate <= endDate;
        });
      }

      if (exportOptions.includeSettings) {
        filteredData.settings = data.settings;
      }

      if (exportOptions.includeDocuments) {
        filteredData.documents = data.documents;
      }

      if (exportOptions.includeAnalytics) {
        filteredData.analytics = data.analytics;
      }

      // Generate file based on format
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (exportOptions.format) {
        case 'json':
          content = JSON.stringify(filteredData, null, 2);
          filename = `aithos-export-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = convertToCSV(filteredData);
          filename = `aithos-export-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'xml':
          content = convertToXML(filteredData);
          filename = `aithos-export-${new Date().toISOString().split('T')[0]}.xml`;
          mimeType = 'application/xml';
          break;
        default:
          throw new Error('Formato não suportado');
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExport?.(data);
    } catch (error) {
      onError?.(`Erro ao exportar dados: ${error}`);
    } finally {
      setIsExporting(false);
    }
  }, [exportOptions, generateMockData, onExport, onError]);

  // Import functionality
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Preview file content
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let data: Partial<ExportData>;
          
          if (file.name.endsWith('.json')) {
            data = JSON.parse(content);
          } else {
            throw new Error('Formato de arquivo não suportado para preview');
          }
          
          setPreviewData(data);
        } catch (error) {
          onError?.(`Erro ao ler arquivo: ${error}`);
        }
      };
      reader.readAsText(file);
    }
  }, [onError]);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !previewData) return;

    setIsImporting(true);
    try {
      const result = await onImport?.(previewData as ExportData);
      
      if (result) {
        setImportResult(result);
      } else {
        // Mock import result
        setImportResult({
          success: true,
          message: 'Dados importados com sucesso!',
          imported: {
            conversations: previewData.conversations?.length || 0,
            documents: previewData.documents?.length || 0,
            settings: previewData.settings ? 1 : 0
          },
          errors: [],
          warnings: []
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: `Erro ao importar dados: ${error}`,
        imported: { conversations: 0, documents: 0, settings: 0 },
        errors: [String(error)],
        warnings: []
      });
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, previewData, onImport]);

  // Utility functions
  const convertToCSV = (data: Partial<ExportData>): string => {
    let csv = '';
    
    if (data.conversations) {
      csv += 'Conversas\n';
      csv += 'ID,Título,Categoria,Data de Criação,Total de Mensagens\n';
      data.conversations.forEach(conv => {
        csv += `"${conv.id}","${conv.title}","${conv.category}","${conv.createdAt}",${conv.messages.length}\n`;
      });
      csv += '\n';
    }
    
    return csv;
  };

  const convertToXML = (data: Partial<ExportData>): string => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<export>\n';
    xml += `  <version>${data.version}</version>\n`;
    xml += `  <timestamp>${data.timestamp}</timestamp>\n`;
    
    if (data.conversations) {
      xml += '  <conversations>\n';
      data.conversations.forEach(conv => {
        xml += '    <conversation>\n';
        xml += `      <id>${conv.id}</id>\n`;
        xml += `      <title><![CDATA[${conv.title}]]></title>\n`;
        xml += `      <category>${conv.category}</category>\n`;
        xml += `      <createdAt>${conv.createdAt}</createdAt>\n`;
        xml += '    </conversation>\n';
      });
      xml += '  </conversations>\n';
    }
    
    xml += '</export>';
    return xml;
  };

  const getDataSummary = (data: Partial<ExportData>) => {
    return {
      conversations: data.conversations?.length || 0,
      documents: data.documents?.length || 0,
      settings: data.settings ? 1 : 0,
      totalSize: JSON.stringify(data).length
    };
  };

  const filteredConversations = previewData?.conversations?.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || conv.category === filterCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const categories = [...new Set(previewData?.conversations?.map(conv => conv.category) || [])];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('export')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === 'export'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Download className="w-4 h-4 mr-2 inline" />
          Exportar Dados
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === 'import'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Upload className="w-4 h-4 mr-2 inline" />
          Importar Dados
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Opções de Exportação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selecionar Dados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="conversations"
                      checked={exportOptions.includeConversations}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeConversations: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="conversations" className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Conversas
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="settings"
                      checked={exportOptions.includeSettings}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeSettings: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="settings" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Configurações
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="documents"
                      checked={exportOptions.includeDocuments}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeDocuments: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="documents" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documentos
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="analytics"
                      checked={exportOptions.includeAnalytics}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeAnalytics: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="analytics" className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Analytics
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="userData"
                      checked={exportOptions.includeUserData}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeUserData: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="userData" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Dados do Usuário
                    </label>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              {exportOptions.includeConversations && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Período</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Inicial:</label>
                      <Input
                        type="date"
                        value={exportOptions.dateRange.start}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Final:</label>
                      <Input
                        type="date"
                        value={exportOptions.dateRange.end}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Format Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Formato</h3>
                <div className="flex gap-4">
                  {(['json', 'csv', 'xml'] as const).map(format => (
                    <div key={format} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={format}
                        name="format"
                        value={format}
                        checked={exportOptions.format === format}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'json' | 'csv' | 'xml'
                        }))}
                      />
                      <label htmlFor={format} className="text-sm font-medium uppercase">
                        {format}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Segurança</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="compression"
                      checked={exportOptions.compression}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        compression: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="compression" className="text-sm font-medium">
                      Compressão (ZIP)
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="encryption"
                      checked={exportOptions.encryption}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        encryption: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="encryption" className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Criptografia
                    </label>
                  </div>
                  
                  {exportOptions.encryption && (
                    <div className="ml-6 space-y-2">
                      <label className="text-sm font-medium">Senha:</label>
                      <Input
                        type="password"
                        placeholder="Digite uma senha forte"
                        value={exportOptions.password || ''}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          password: e.target.value
                        }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  size="lg"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isExporting ? 'Exportando...' : 'Exportar Dados'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* File Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Arquivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.xml"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Selecione um arquivo para importar</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Formatos suportados: JSON, CSV, XML
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Escolher Arquivo
                </Button>
              </div>
              
              {selectedFile && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Preview */}
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Preview dos Dados
                  <div className="flex items-center gap-4">
                    <Input
                      placeholder="Buscar conversas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                      icon={<Search className="w-4 h-4" />}
                    />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="all">Todas as categorias</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Data Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(getDataSummary(previewData)).map(([key, value]) => (
                    <div key={key} className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {key === 'totalSize' ? 'Tamanho (bytes)' : key}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Conversations Preview */}
                {filteredConversations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Conversas ({filteredConversations.length})</h3>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredConversations.map(conv => (
                        <div key={conv.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{conv.title}</h4>
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {conv.category}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {conv.messages.length} mensagens • {new Date(conv.createdAt).toLocaleDateString()}
                          </div>
                          {conv.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {conv.tags.map(tag => (
                                <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || !selectedFile}
                    size="lg"
                  >
                    {isImporting ? (
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isImporting ? 'Importando...' : 'Importar Dados'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Result */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  Resultado da Importação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={cn(
                  'p-4 rounded-lg',
                  importResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                )}>
                  {importResult.message}
                </div>

                {importResult.success && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{importResult.imported.conversations}</div>
                      <div className="text-sm text-muted-foreground">Conversas</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{importResult.imported.documents}</div>
                      <div className="text-sm text-muted-foreground">Documentos</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{importResult.imported.settings}</div>
                      <div className="text-sm text-muted-foreground">Configurações</div>
                    </div>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Erros:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-yellow-600">Avisos:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {importResult.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-600">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default DataExportImport;