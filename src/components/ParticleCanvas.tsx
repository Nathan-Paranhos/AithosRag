import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { ParticleSystem, ParticleSystemConfig } from '../utils/ParticleSystem';
import { SVGParser } from '../utils/SVGParser';

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



  // Configuração memoizada do sistema de partículas
  const particleConfig = useMemo(() => ({
    particleCount,
    particleColor,
    particleSize,
    canvasWidth: width,
    canvasHeight: height,
    connectionDistance: width < 768 ? 60 : 100, // Menor distância em mobile
    animationSpeed,
    speed: animationSpeed,
    glowEffect
  }), [width, height, particleCount, particleColor, particleSize, animationSpeed, glowEffect]);

  // Função de limpeza segura
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
      
      isInitializedRef.current = false;
    } catch (error) {
      console.warn('Erro durante limpeza do sistema de partículas:', error);
    }
  }, []);

  // Inicializar sistema de partículas com verificações robustas
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
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Contexto 2D não disponível no canvas');
      return;
    }

    try {
      // Configurar dimensões do canvas
      canvas.width = width;
      canvas.height = height;
      
      // Criar sistema de partículas com validação
      const particleSystem = new ParticleSystem(canvas, ctx, particleConfig);
      particleSystemRef.current = particleSystem;
      
      // Criar parser SVG com configuração otimizada
      svgParserRef.current = new SVGParser({
        density: Math.max(0.5, Math.min(2, width / 800)), // Densidade adaptativa
        scale: Math.max(0.8, Math.min(1.5, width / 1000)), // Escala responsiva
        offsetX: 0,
        offsetY: 0
      });
      
      // Iniciar animação com delay para garantir inicialização completa
      setTimeout(() => {
        if (particleSystemRef.current && !isInitializedRef.current) {
          particleSystem.startAnimation();
          isInitializedRef.current = true;
        }
      }, 100);
      
      // Armazenar função de limpeza
      cleanupRef.current = safeCleanup;
      
    } catch (error) {
      console.error('Erro ao inicializar sistema de partículas:', error);
      safeCleanup();
    }
    
    return safeCleanup;
  }, [particleConfig, width, height, safeCleanup]);



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