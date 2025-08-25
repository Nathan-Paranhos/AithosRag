import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRight, Brain, Zap, Database } from '../utils/icons.tsx';
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
    <section id="home" className="pt-16 bg-gray-50 min-h-screen flex items-center relative overflow-hidden">
      {/* Background de partículas */}
      <div className="absolute inset-0 z-0">
        <ParticleCanvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          particleCount={dimensions.width < 768 ? 75 : dimensions.width < 1024 ? 100 : 150}
          particleSize={dimensions.width < 768 ? 1.5 : 2}
          particleColor="#3b82f6"
          animationSpeed={0.5}
          formationSpeed={2}
          disperseSpeed={1.5}
          glowEffect={true}
          trailEffect={false}
          className="particle-canvas"
        />
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
          {/* Left Content */}
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Aithos RAG: <span className="text-blue-600">Conectando</span> seu conhecimento com <span className="text-blue-600">inteligência avançada</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Descubra como o Aithos RAG revoluciona a gestão de conhecimento corporativo, 
              tornando informações cruciais acessíveis em segundos.
            </p>
            <button 
              onClick={scrollToProduct}
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg group"
            >
              Saiba Mais
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>

          {/* Right Content - Hero Image */}
          <div className="mt-12 lg:mt-0 animate-fade-in-delay">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-12 shadow-2xl border border-gray-100">
                <div className="grid grid-cols-3 gap-8 mb-8">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      <Database className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Documentos</span>
                  </div>
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">IA RAG</span>
                  </div>
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Respostas</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
                    <Brain className="h-5 w-5 mr-2" />
                    <span className="font-semibold">Sistema RAG Ativo</span>
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