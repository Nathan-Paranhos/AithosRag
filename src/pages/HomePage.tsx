import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, BarChart3, FileText, Settings, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import { LoadingSpinner, SkeletonCard, ProgressBar } from '../components/LoadingStates';
import { FadeIn, SlideIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading process
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsLoading(false);
          clearInterval(timer);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Bot,
      title: 'AI Chat Inteligente',
      description: 'Converse com nossa IA avançada para obter respostas precisas e contextuais.',
      link: '/chat'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançado',
      description: 'Visualize dados e métricas em tempo real com dashboards interativos.',
      link: '/analytics'
    },
    {
      icon: FileText,
      title: 'Gestão de Documentos',
      description: 'Organize e processe seus documentos com tecnologia RAG.',
      link: '/documents'
    },
    {
      icon: Settings,
      title: 'Configurações',
      description: 'Personalize sua experiência e configure preferências.',
      link: '/settings'
    }
  ];

  const highlights = [
    {
      icon: Zap,
      title: 'Performance Otimizada',
      description: 'Sistema otimizado para máxima velocidade e eficiência.'
    },
    {
      icon: Shield,
      title: 'Segurança Avançada',
      description: 'Proteção de dados com criptografia de ponta a ponta.'
    },
    {
      icon: Globe,
      title: 'Acesso Global',
      description: 'Disponível 24/7 com suporte offline e sincronização.'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <ProgressBar progress={progress} className="mt-4 w-64" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 dark:from-blue-400/5 dark:to-purple-400/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Bem-vindo ao
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Aithos RAG</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Plataforma inteligente de IA com tecnologia RAG para processamento avançado de documentos e análise de dados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                as={Link}
                to="/chat"
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                as={Link}
                to="/analytics"
                variant="outline"
                size="lg"
                className="px-8 py-4 rounded-xl font-semibold border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300"
              >
                Ver Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Recursos Principais
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Descubra todas as funcionalidades que tornam o Aithos RAG a escolha ideal para suas necessidades.
          </p>
        </div>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <StaggerItem key={index}>
                  <Card
                    className="group p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
                  >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 flex-1">
                    {feature.description}
                  </p>
                  <Button
                    as={Link}
                    to={feature.link}
                    variant="ghost"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group-hover:translate-x-1 transition-transform duration-300"
                  >
                    Explorar
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </Card>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>
      </div>

      {/* Highlights Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Por que Escolher Aithos?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Tecnologia de ponta desenvolvida pela Aithos Tech para oferecer a melhor experiência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white mb-6">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {highlight.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-900 py-12 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Desenvolvido por{' '}
            <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Aithos Tech
            </span>
          </p>
        </div>
      </div>
      </div>
    </FadeIn>
  );
};

export default HomePage;