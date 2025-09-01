import React, { useState, useEffect } from 'react';
import { FileText, Upload, Search, Filter, Download, Trash2, Eye, Plus } from 'lucide-react';
import { LoadingSpinner, LoadingButton, SkeletonCard, SkeletonText } from '../components/LoadingStates';
import { FadeIn, SlideIn, StaggerContainer, StaggerItem, HoverAnimation } from '../components/Animations';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useConnectivity } from '../utils/connectivity';
import { ConnectivityIndicator } from '../components/ConnectivityIndicator';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'processed' | 'processing' | 'error';
  tags: string[];
}

const DocumentsPage: React.FC = () => {
  const { isOnline, isApiAvailable } = useConnectivity();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Simulate loading documents
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const mockDocuments: Document[] = [
    {
      id: '1',
      name: 'Relatório Anual 2024.pdf',
      type: 'PDF',
      size: '2.4 MB',
      uploadDate: '2024-01-15',
      status: 'processed',
      tags: ['relatório', 'anual', '2024']
    },
    {
      id: '2',
      name: 'Manual do Usuário.docx',
      type: 'DOCX',
      size: '1.8 MB',
      uploadDate: '2024-01-14',
      status: 'processed',
      tags: ['manual', 'usuário', 'documentação']
    },
    {
      id: '3',
      name: 'Apresentação Projeto.pptx',
      type: 'PPTX',
      size: '5.2 MB',
      uploadDate: '2024-01-13',
      status: 'processing',
      tags: ['apresentação', 'projeto']
    },
    {
      id: '4',
      name: 'Dados Financeiros.xlsx',
      type: 'XLSX',
      size: '3.1 MB',
      uploadDate: '2024-01-12',
      status: 'processed',
      tags: ['financeiro', 'dados', 'planilha']
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'processing':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processed':
        return 'Processado';
      case 'processing':
        return 'Processando';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = selectedFilter === 'all' || doc.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <SkeletonText width="200px" height="32px" className="mb-2" />
            <SkeletonText width="400px" height="20px" />
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Carregando documentos...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} height="200px" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Documentos
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Gerencie e processe seus documentos
                </p>
              </div>
            </div>
            <ConnectivityIndicator position="static" showDetails={true} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Todos</option>
              <option value="processed">Processados</option>
              <option value="processing">Processando</option>
              <option value="error">Com Erro</option>
            </select>
          </div>

          {/* Upload Button */}
          <LoadingButton
            isLoading={isUploading}
            onClick={() => {
              setIsUploading(true);
              setTimeout(() => setIsUploading(false), 2000);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            disabled={!isOnline || !isApiAvailable}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </LoadingButton>
        </div>

        {/* Documents Grid */}
        {!isOnline || !isApiAvailable ? (
          <Card className="p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                <FileText className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
                {!isOnline ? 'Sem Conexão com a Internet' : 'API Indisponível'}
              </h2>
              <p className="text-yellow-700 dark:text-yellow-300 max-w-md">
                {!isOnline 
                  ? 'Verifique sua conexão com a internet para gerenciar documentos.'
                  : 'O serviço de documentos está temporariamente indisponível.'
                }
              </p>
            </div>
          </Card>
        ) : (
          <StaggerContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Upload Card */}
              <StaggerItem>
                <HoverAnimation>
                  <Card className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-300 cursor-pointer group">
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors duration-300 mb-4">
                  <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Adicionar Documento
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Clique para fazer upload de um novo documento
                </p>
                  </div>
                  </Card>
                </HoverAnimation>
              </StaggerItem>

              {/* Document Cards */}
              {filteredDocuments.map((doc) => (
                <StaggerItem key={doc.id}>
                  <HoverAnimation>
                    <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 group">
                <div className="flex flex-col h-48">
                  {/* Document Icon & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusText(doc.status)}
                    </span>
                  </div>

                  {/* Document Info */}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {doc.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <p>Tipo: {doc.type}</p>
                      <p>Tamanho: {doc.size}</p>
                      <p>Upload: {new Date(doc.uploadDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {doc.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                        {tag}
                      </span>
                    ))}
                    {doc.tags.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                        +{doc.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    </div>
                  </div>
                    </Card>
                  </HoverAnimation>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        )}

        {/* Empty State */}
        {filteredDocuments.length === 0 && (isOnline && isApiAvailable) && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Nenhum documento encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-md">
                {searchTerm || selectedFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca para encontrar documentos.'
                  : 'Comece fazendo upload do seu primeiro documento.'}
              </p>
              {!searchTerm && selectedFilter === 'all' && (
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium">
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer Upload
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
      </div>
    </FadeIn>
  );
};

export default DocumentsPage;