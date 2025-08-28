import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRight, Brain, Zap, Database } from 'lucide-react';
import ParticleCanvas from './ParticleCanvas';
import { useParticleAnimation } from '../hooks/useParticleAnimation';
import '../styles/particles.css';

const Hero: React.FC = () => {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });

  const scrollToProduct = () => {
    const element = document.getElementById('produto');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Função para atualizar dimensões responsivamente
  const updateDimensions = useCallback(() => {
    if (typeof window !== 'undefined') {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  }, []);

  // Listener para redimensionamento
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateDimensions);
      window.addEventListener('orientationchange', updateDimensions);
      
      // Atualizar dimensões iniciais
      updateDimensions();
      
      return () => {
        window.removeEventListener('resize', updateDimensions);
        window.removeEventListener('orientationchange', updateDimensions);
      };
    }
  }, [updateDimensions]);

  // Configurar animação de partículas
  const {
    canvasRef,
    startAnimation,
    formLogo,
    isAnimating
  } = useParticleAnimation({
    autoStart: true,
    loopAnimation: true,
    formationDelay: 2000,
    disperseDelay: 4000
  });

  // SVG do logo Aithos (simplificado)
  const aithosLogoSVG = `
    <svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
      <text x="10" y="50" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#2563eb">AITHOS</text>
    </svg>
  `;

  // Iniciar animação quando o componente montar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (canvasRef.current && !isAnimating) {
        startAnimation();
        // Formar logo após 1 segundo
        setTimeout(() => {
          formLogo(aithosLogoSVG, 'AITHOS');
        }, 1000);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [canvasRef, startAnimation, formLogo, isAnimating, aithosLogoSVG]);

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-brand-dark-blue to-primary-900">
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
      </div>
      
      {/* Background de partículas */}
      <div className="absolute inset-0 z-0">
        <ParticleCanvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          particleCount={dimensions.width < 768 ? 75 : dimensions.width < 1024 ? 100 : 150}
          particleSize={dimensions.width < 768 ? 1.5 : 2}
          particleColor="#60a5fa"
          animationSpeed={0.5}
          formationSpeed={2}
          disperseSpeed={1.5}
          glowEffect={true}
          trailEffect={false}
          className="particle-canvas"
        />
      </div>
      
      {/* Geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Left Content */}
          <div className="animate-fade-in">
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary-500/20 text-primary-200 border border-primary-400/30 backdrop-blur-sm">
                <Zap className="w-4 h-4 mr-2" />
                Powered by Advanced AI
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight mb-8">
              <span className="text-brand-main-blue">
                Aithos RAG
              </span>
              <br />
              <span className="text-white/90 text-3xl md:text-4xl lg:text-5xl font-light">
                Conectando conhecimento com
              </span>
              <br />
              <span className="text-primary-300">
                inteligência avançada
              </span>
            </h1>
            <p className="text-xl text-primary-100/90 mb-10 leading-relaxed max-w-2xl">
              Revolucione a gestão de conhecimento corporativo com nossa plataforma de IA avançada. 
              Transforme documentos em insights acionáveis em segundos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={scrollToProduct}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-brand-main-blue hover:bg-brand-hover-blue rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
              >
                <span className="relative flex items-center">
                  Descobrir Mais
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </button>
              <button className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary-200 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300">
                <Brain className="mr-2 h-5 w-5" />
                Ver Demo
              </button>
            </div>
          </div>

          {/* Right Content - Interactive Dashboard */}
          <div className="mt-12 lg:mt-0 animate-fade-in-delay">
            <div className="relative">
              {/* Glassmorphism Card */}
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-500 rounded-2xl opacity-80 animate-pulse"></div>
                <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-primary-400 rounded-xl opacity-60 animate-pulse delay-500"></div>
                
                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Sistema RAG Inteligente</h3>
                  <p className="text-blue-200/80">Processamento em tempo real</p>
                </div>
                
                {/* Process Flow */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center space-y-3 flex-1">
                      <div className="relative">
                        <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
                          <Database className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-sm font-medium text-white/90">Documentos</span>
                      <div className="text-xs text-blue-200/70">1.2M+ docs</div>
                    </div>
                    
                    <div className="flex-shrink-0 mx-4">
                      <ArrowRight className="h-6 w-6 text-blue-300 animate-pulse" />
                    </div>
                    
                    <div className="flex flex-col items-center space-y-3 flex-1">
                      <div className="relative">
                        <div className="w-16 h-16 bg-brand-main-blue rounded-2xl flex items-center justify-center shadow-lg">
                          <Brain className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping delay-300"></div>
                      </div>
                      <span className="text-sm font-medium text-white/90">IA RAG</span>
                      <div className="text-xs text-blue-200/70">99.8% precisão</div>
                    </div>
                    
                    <div className="flex-shrink-0 mx-4">
                      <ArrowRight className="h-6 w-6 text-blue-300 animate-pulse delay-150" />
                    </div>
                    
                    <div className="flex flex-col items-center space-y-3 flex-1">
                      <div className="relative">
                        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Zap className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-ping delay-600"></div>
                      </div>
                      <span className="text-sm font-medium text-white/90">Respostas</span>
                      <div className="text-xs text-blue-200/70">&lt;2s resposta</div>
                    </div>
                  </div>
                </div>
                
                {/* Status Indicator */}
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center bg-primary-500/20 backdrop-blur-sm text-primary-200 px-6 py-3 rounded-2xl border border-primary-400/30">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                    <span className="font-semibold">Sistema Ativo • Processando</span>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-lg font-bold text-white">24/7</div>
                    <div className="text-xs text-blue-200/70">Disponível</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-lg font-bold text-white">50+</div>
                    <div className="text-xs text-blue-200/70">Idiomas</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-lg font-bold text-white">∞</div>
                    <div className="text-xs text-blue-200/70">Escalável</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;