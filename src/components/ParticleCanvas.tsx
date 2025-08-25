import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { ParticleSystem, ParticleSystemConfig } from '../utils/ParticleSystem';
import { SVGParser } from '../utils/SVGParser';
import { 
  intelligentCache, 
  advancedDebounce, 
  lazyLoadManager, 
  memoryManager, 
  performanceMonitor,
  isMobile,
  getOptimalChunkSize
} from '../utils/performanceOptimizations';

export interface ParticleCanvasProps {
  width: number;
  height: number;
  particleCount: number;
  particleColor: string;
  particleSize: number;
  animationSpeed: number;
  glowEffect: boolean;
  className?: string;
  svgPath?: string;
  connectionDistance?: number;
  onParticleClick?: (particle: { x: number; y: number; id: string }) => void;
}

export interface ParticleCanvasRef {
  startAnimation: () => void;
  stopAnimation: () => void;
  formLogo: (svgString?: string, text?: string) => void;
  disperseParticles: () => void;
  updateConfig: (config: Partial<ParticleSystemConfig>) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

const ParticleCanvas = forwardRef<ParticleCanvasRef, ParticleCanvasProps>((
  {
    width = 800,
    height = 600,
    particleCount = 100,
    particleSize = 2,
    particleColor = '#3b82f6',
    animationSpeed = 1,
    glowEffect = false,
    className = ''
  },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const svgParserRef = useRef<SVGParser | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef<number>(0);
  const performanceStatsRef = useRef({ frames: 0, lastTime: 0, fps: 0 });
  
  // Estados para otimização
  const [isVisible, setIsVisible] = useState(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [adaptiveQuality, setAdaptiveQuality] = useState(1);



  // Configuração memoizada do sistema de partículas com otimizações adaptativas
  const particleConfig = useMemo(() => {
    const mobile = isMobile();
    const devicePixelRatio = window.devicePixelRatio || 1;
    const qualityMultiplier = adaptiveQuality;
    
    // Ajustar configurações baseado no dispositivo e performance
    const optimizedParticleCount = Math.floor(
      mobile 
        ? Math.min(particleCount * 0.6, 60) * qualityMultiplier
        : particleCount * qualityMultiplier
    );
    
    const optimizedConnectionDistance = mobile 
      ? Math.min(60, width * 0.08) 
      : Math.min(100, width * 0.12);
    
    const optimizedAnimationSpeed = isLowPowerMode 
      ? animationSpeed * 0.5 
      : animationSpeed;
    
    return {
      particleCount: optimizedParticleCount,
      particleColor,
      particleSize: particleSize * (mobile ? 0.8 : 1) * devicePixelRatio,
      canvasWidth: width,
      canvasHeight: height,
      connectionDistance: optimizedConnectionDistance,
      animationSpeed: optimizedAnimationSpeed,
      speed: optimizedAnimationSpeed,
      glowEffect: glowEffect && !isLowPowerMode,
      mobile,
      devicePixelRatio,
      qualityMultiplier
    };
  }, [width, height, particleCount, particleColor, particleSize, animationSpeed, glowEffect, adaptiveQuality, isLowPowerMode]);

  // Função de limpeza segura com memory management
  const safeCleanup = useCallback(() => {
    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
        particleSystemRef.current = null;
      }
      
      // Limpar cache específico do componente
      intelligentCache.clear();
      
      // Limpar listeners de memory management
      memoryManager.cleanup('particle-canvas');
      
      isInitializedRef.current = false;
      
      // Reset performance stats
      performanceStatsRef.current = { frames: 0, lastTime: 0, fps: 0 };
      
    } catch (error) {
      console.warn('Erro durante limpeza do sistema de partículas:', error);
    }
  }, []);

  // Performance monitoring e adaptive quality
  const monitorPerformance = useCallback(() => {
    const now = performance.now();
    const stats = performanceStatsRef.current;
    
    stats.frames++;
    
    if (now - stats.lastTime >= 1000) {
      stats.fps = Math.round((stats.frames * 1000) / (now - stats.lastTime));
      stats.frames = 0;
      stats.lastTime = now;
      
      // Adaptive quality baseado no FPS
      if (stats.fps < 30 && adaptiveQuality > 0.3) {
        setAdaptiveQuality(prev => Math.max(0.3, prev - 0.1));
        setIsLowPowerMode(true);
      } else if (stats.fps > 50 && adaptiveQuality < 1) {
        setAdaptiveQuality(prev => Math.min(1, prev + 0.1));
        setIsLowPowerMode(false);
      }
      
      // Registrar métricas
      performanceMonitor.recordApiCall(now - lastFrameTimeRef.current);
    }
    
    lastFrameTimeRef.current = now;
  }, [adaptiveQuality]);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsVisible(entry.isIntersecting);
          if (entry.isIntersecting) {
            lazyLoadManager.observe(canvas, 'particle-canvas');
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(canvas);
    
    // Registrar cleanup no memory manager
    memoryManager.addListener('particle-canvas', () => {
      observer.disconnect();
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Debounced resize handler
  const debouncedResize = useCallback(
    advancedDebounce.debounce(() => {
      const canvas = canvasRef.current;
      if (canvas && particleSystemRef.current) {
        const rect = canvas.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * devicePixelRatio;
        canvas.height = rect.height * devicePixelRatio;
        
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(devicePixelRatio, devicePixelRatio);
        }
      }
    }, 250, 'canvas-resize'),
    []
  );

  // Inicializar sistema de partículas com verificações robustas e otimizações
  useEffect(() => {
    // Evitar múltiplas inicializações
    if (isInitializedRef.current) {
      safeCleanup();
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('Canvas não encontrado para inicialização do sistema de partículas');
      return;
    }
    
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true, // Melhor performance
      powerPreference: 'high-performance'
    });
    
    if (!ctx) {
      console.error('Contexto 2D não disponível no canvas');
      return;
    }

    try {
      // Configurar dimensões do canvas com device pixel ratio
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(devicePixelRatio, devicePixelRatio);
      
      // Otimizações de rendering
      ctx.imageSmoothingEnabled = !isMobile();
      ctx.imageSmoothingQuality = isMobile() ? 'low' : 'high';
      
      // Criar sistema de partículas com validação
      const particleSystem = new ParticleSystem(canvas, ctx, particleConfig);
      particleSystemRef.current = particleSystem;
      
      // Criar parser SVG com configuração otimizada
      svgParserRef.current = new SVGParser({
        density: Math.max(0.3, Math.min(2, width / 800)) * adaptiveQuality,
        scale: Math.max(0.6, Math.min(1.5, width / 1000)) * adaptiveQuality,
        offsetX: 0,
        offsetY: 0
      });
      
      // Cache da configuração
      const configKey = `particle-config-${width}-${height}-${particleCount}`;
      intelligentCache.set(configKey, particleConfig, 5 * 60 * 1000);
      
      // Iniciar animação apenas se visível
      const initAnimation = () => {
        if (particleSystemRef.current && !isInitializedRef.current && isVisible) {
          particleSystem.startAnimation();
          isInitializedRef.current = true;
          
          // Iniciar monitoring de performance
          const monitorInterval = setInterval(monitorPerformance, 1000);
          memoryManager.addInterval(monitorInterval);
        }
      };
      
      if (isVisible) {
        setTimeout(initAnimation, 100);
      } else {
        // Aguardar visibilidade
        const visibilityCheck = setInterval(() => {
          if (isVisible) {
            clearInterval(visibilityCheck);
            initAnimation();
          }
        }, 100);
        
        memoryManager.addInterval(visibilityCheck);
      }
      
      // Armazenar função de limpeza
      cleanupRef.current = safeCleanup;
      
      // Listener para resize
      window.addEventListener('resize', debouncedResize);
      memoryManager.addListener('particle-canvas', () => {
        window.removeEventListener('resize', debouncedResize);
      });
      
    } catch (error) {
      console.error('Erro ao inicializar sistema de partículas:', error);
      safeCleanup();
    }
    
    return safeCleanup;
  }, [particleConfig, width, height, safeCleanup, isVisible, adaptiveQuality, monitorPerformance, debouncedResize]);



  // Iniciar animação com validações
  const startAnimation = useCallback(() => {
    try {
      if (particleSystemRef.current && isInitializedRef.current) {
        particleSystemRef.current.startAnimation();
      } else if (!isInitializedRef.current) {
        console.warn('Sistema de partículas não inicializado. Aguardando inicialização...');
        // Tentar novamente após um breve delay
        setTimeout(() => {
          if (particleSystemRef.current && isInitializedRef.current) {
            particleSystemRef.current.startAnimation();
          }
        }, 200);
      }
    } catch (error) {
      console.error('Erro ao iniciar animação de partículas:', error);
    }
  }, []);

  // Parar animação com limpeza segura
  const stopAnimation = useCallback(() => {
    try {
      if (particleSystemRef.current) {
        particleSystemRef.current.stopAnimation();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } catch (error) {
      console.error('Erro ao parar animação de partículas:', error);
    }
  }, []);

  // Criar logo temática do AITHOS
  const createDefaultLogo = useCallback((): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Configurações da logo
    const logoWidth = Math.min(width, height) * 0.7;
    const letterHeight = logoWidth * 0.15;
    const letterSpacing = logoWidth * 0.12;
    const startX = centerX - (logoWidth * 0.4);
    
    // Função para criar pontos de uma letra
    const createLetter = (letter: string, x: number, y: number) => {
      const letterPoints: { x: number; y: number }[] = [];
      
      switch (letter) {
        case 'A':
          // Linha esquerda
          for (let i = 0; i <= 15; i++) {
            letterPoints.push({ x: x - 20 + i * 1.3, y: y + 40 - i * 2.5 });
          }
          // Linha direita
          for (let i = 0; i <= 15; i++) {
            letterPoints.push({ x: x + 20 - i * 1.3, y: y + 40 - i * 2.5 });
          }
          // Linha horizontal
          for (let i = 0; i <= 10; i++) {
            letterPoints.push({ x: x - 10 + i * 2, y: y + 15 });
          }
          break;
          
        case 'I':
          // Linha vertical
          for (let i = 0; i <= 20; i++) {
            letterPoints.push({ x, y: y - 20 + i * 2 });
          }
          // Linha superior
          for (let i = 0; i <= 8; i++) {
            letterPoints.push({ x: x - 15 + i * 4, y: y - 20 });
          }
          // Linha inferior
          for (let i = 0; i <= 8; i++) {
            letterPoints.push({ x: x - 15 + i * 4, y: y + 20 });
          }
          break;
          
        case 'T':
          // Linha horizontal superior
          for (let i = 0; i <= 12; i++) {
            letterPoints.push({ x: x - 25 + i * 4, y: y - 20 });
          }
          // Linha vertical
          for (let i = 0; i <= 20; i++) {
            letterPoints.push({ x, y: y - 20 + i * 2 });
          }
          break;
          
        case 'H':
          // Linha esquerda
          for (let i = 0; i <= 20; i++) {
            letterPoints.push({ x: x - 15, y: y - 20 + i * 2 });
          }
          // Linha direita
          for (let i = 0; i <= 20; i++) {
            letterPoints.push({ x: x + 15, y: y - 20 + i * 2 });
          }
          // Linha horizontal
          for (let i = 0; i <= 8; i++) {
            letterPoints.push({ x: x - 15 + i * 4, y });
          }
          break;
          
        case 'O':
          // Círculo
          for (let i = 0; i <= 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            letterPoints.push({
              x: x + Math.cos(angle) * 18,
              y: y + Math.sin(angle) * 20
            });
          }
          break;
          
        case 'S':
          // Curva superior
          for (let i = 0; i <= 10; i++) {
            const angle = (i / 10) * Math.PI;
            letterPoints.push({
              x: x + Math.cos(angle) * 15,
              y: y - 10 + Math.sin(angle) * 10
            });
          }
          // Curva inferior
          for (let i = 0; i <= 10; i++) {
            const angle = Math.PI + (i / 10) * Math.PI;
            letterPoints.push({
              x: x + Math.cos(angle) * 15,
              y: y + 10 + Math.sin(angle) * 10
            });
          }
          break;
      }
      
      return letterPoints;
    };
    
    // Criar letras AITHOS
    const letters = ['A', 'I', 'T', 'H', 'O', 'S'];
    letters.forEach((letter, index) => {
      const letterX = startX + index * letterSpacing;
      const letterPoints = createLetter(letter, letterX, centerY);
      points.push(...letterPoints);
    });
    
    // Adicionar ícone de cérebro digital acima do texto
    const brainY = centerY - letterHeight * 1.5;
    const brainSize = letterHeight * 0.8;
    
    // Contorno do cérebro
    for (let i = 0; i <= 25; i++) {
      const angle = (i / 25) * Math.PI;
      const radius = brainSize * (0.8 + 0.2 * Math.sin(angle * 3));
      points.push({
        x: centerX - brainSize * 0.2 + Math.cos(angle) * radius,
        y: brainY + Math.sin(angle) * radius * 0.7
      });
    }
    
    for (let i = 0; i <= 25; i++) {
      const angle = (i / 25) * Math.PI;
      const radius = brainSize * (0.8 + 0.2 * Math.sin(angle * 3));
      points.push({
        x: centerX + brainSize * 0.2 + Math.cos(angle) * radius,
        y: brainY + Math.sin(angle) * radius * 0.7
      });
    }
    
    // Conexões neurais ao redor do texto
    const neuralConnections = [
      // Conexões horizontais
      { start: { x: startX - 40, y: centerY }, end: { x: startX + logoWidth + 40, y: centerY } },
      { start: { x: startX - 30, y: centerY - 30 }, end: { x: startX + logoWidth + 30, y: centerY - 30 } },
      { start: { x: startX - 30, y: centerY + 30 }, end: { x: startX + logoWidth + 30, y: centerY + 30 } },
      
      // Conexões verticais
      { start: { x: centerX, y: brainY - 30 }, end: { x: centerX, y: centerY + letterHeight + 30 } },
      { start: { x: centerX - 60, y: brainY }, end: { x: centerX - 60, y: centerY + letterHeight } },
      { start: { x: centerX + 60, y: brainY }, end: { x: centerX + 60, y: centerY + letterHeight } }
    ];
    
    neuralConnections.forEach(connection => {
      const dx = connection.end.x - connection.start.x;
      const dy = connection.end.y - connection.start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(distance / 8);
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        points.push({
          x: connection.start.x + dx * t,
          y: connection.start.y + dy * t
        });
      }
    });
    
    // Nós de processamento (pontos de intersecção)
    const processingNodes = [
      { x: centerX, y: brainY },
      { x: centerX - 60, y: centerY },
      { x: centerX + 60, y: centerY },
      { x: startX + letterSpacing, y: centerY - 30 },
      { x: startX + letterSpacing * 3, y: centerY + 30 },
      { x: startX + letterSpacing * 5, y: centerY - 30 }
    ];
    
    processingNodes.forEach(node => {
      // Criar cluster ao redor de cada nó
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 8 + Math.random() * 6;
        points.push({
          x: node.x + Math.cos(angle) * radius,
          y: node.y + Math.sin(angle) * radius
        });
      }
    });
    
    // Padrões de circuito integrado
    for (let i = 0; i < 4; i++) {
      const circuitY = centerY + letterHeight + 40 + i * 15;
      for (let j = 0; j < 8; j++) {
        const circuitX = startX + j * (logoWidth / 7);
        points.push({ x: circuitX, y: circuitY });
        
        // Conexões verticais pequenas
        if (j % 2 === 0) {
          for (let k = 1; k <= 3; k++) {
            points.push({ x: circuitX, y: circuitY + k * 3 });
          }
        }
      }
    }
    
    // Partículas flutuantes para efeito de dados
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = brainSize * 1.5 + Math.random() * 100;
      points.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance * 0.6
      });
    }
    
    return points;
  }, [width, height]);

  // Formar logo com validações robustas
  const formLogo = useCallback((svgString?: string, text?: string) => {
    try {
      if (!particleSystemRef.current) {
        console.warn('Sistema de partículas não disponível para formar logo');
        return;
      }
      
      if (!svgParserRef.current) {
        console.warn('Parser SVG não disponível para formar logo');
        return;
      }
      
      let points: { x: number; y: number }[] = [];
      
      if (svgString && svgString.trim()) {
        try {
          points = svgParserRef.current.parseSVGString(svgString);
        } catch (error) {
          console.error('Erro ao processar SVG string:', error);
          points = createDefaultLogo();
        }
      } else if (text && text.trim()) {
        try {
          points = svgParserRef.current.createTextPoints(text, width / 2, height / 2, 48);
        } catch (error) {
          console.error('Erro ao criar pontos de texto:', error);
          points = createDefaultLogo();
        }
      } else {
        points = createDefaultLogo();
      }
      
      if (points && points.length > 0) {
        particleSystemRef.current.formLogo(points);
      } else {
        console.warn('Nenhum ponto válido gerado para formar logo');
      }
    } catch (error) {
      console.error('Erro ao formar logo:', error);
    }
  }, [createDefaultLogo, width, height]);

  // Dispersar partículas com validação
  const disperseParticles = useCallback(() => {
    try {
      if (particleSystemRef.current) {
        particleSystemRef.current.disperseParticles();
      } else {
        console.warn('Sistema de partículas não disponível para dispersar');
      }
    } catch (error) {
      console.error('Erro ao dispersar partículas:', error);
    }
  }, []);

  // Atualizar configuração com validação
  const updateConfig = useCallback((config: Partial<ParticleSystemConfig>) => {
    try {
      if (particleSystemRef.current && config) {
        particleSystemRef.current.updateConfig(config);
      } else {
        console.warn('Sistema de partículas ou configuração inválida');
      }
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
    }
  }, []);

  // Obter canvas com validação
  const getCanvas = useCallback(() => {
    try {
      return canvasRef.current;
    } catch (error) {
      console.error('Erro ao obter canvas:', error);
      return null;
    }
  }, []);

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    startAnimation,
    stopAnimation,
    formLogo,
    disperseParticles,
    updateConfig,
    getCanvas
  }), [startAnimation, stopAnimation, formLogo, disperseParticles, updateConfig, getCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`particle-canvas ${className}`}
      style={{
        display: 'block',
        maxWidth: '100%',
        height: 'auto',
        touchAction: 'none' // Prevenir scroll em mobile
      }}
    />
  );
});

ParticleCanvas.displayName = 'ParticleCanvas';

export default ParticleCanvas;