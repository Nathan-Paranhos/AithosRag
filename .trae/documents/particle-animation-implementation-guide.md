# Guia de Implementação - Animação de Partículas para Logo

## 1. Estrutura do Projeto

```
particle-logo-animation/
├── src/
│   ├── components/
│   │   ├── ParticleCanvas.tsx
│   │   ├── AnimationControls.tsx
│   │   └── ConfigPanel.tsx
│   ├── utils/
│   │   ├── ParticleSystem.ts
│   │   ├── SVGParser.ts
│   │   └── AnimationSequencer.ts
│   ├── hooks/
│   │   ├── useParticleAnimation.ts
│   │   └── useGSAPTimeline.ts
│   └── styles/
│       ├── particles.css
│       └── effects.css
├── public/
│   └── logos/
│       └── sample-logo.svg
└── package.json
```

## 2. Configuração Inicial

### 2.1 Dependências do Projeto

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "gsap": "^3.12.2",
    "three": "^0.158.0",
    "@types/three": "^0.158.0",
    "tailwindcss": "^3.3.0"
  }
}
```

### 2.2 Configuração do Canvas Principal

```typescript
// src/components/ParticleCanvas.tsx
import React, { useRef, useEffect } from 'react';
import { ParticleSystem } from '../utils/ParticleSystem';
import { useParticleAnimation } from '../hooks/useParticleAnimation';

interface ParticleCanvasProps {
  logoSvg: string;
  config: AnimationConfig;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ logoSvg, config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { startAnimation, stopAnimation, isAnimating } = useParticleAnimation();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Configurar canvas para alta resolução
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Inicializar sistema de partículas
    const particleSystem = new ParticleSystem(canvas, config);
    particleSystem.loadLogo(logoSvg);
    particleSystem.start();

    return () => {
      particleSystem.destroy();
    };
  }, [logoSvg, config]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-purple-900 to-blue-900">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'blur(0px)' }}
      />
      
      {/* Overlay de efeitos */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="particle-glow-overlay" />
      </div>
    </div>
  );
};
```

## 3. Sistema de Partículas Avançado

### 3.1 Classe Principal do Sistema

```typescript
// src/utils/ParticleSystem.ts
import { gsap } from 'gsap';
import { SVGParser } from './SVGParser';

export interface Particle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  glowIntensity: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private connections: Array<[number, number]> = [];
  private animationId: number = 0;
  private timeline: gsap.core.Timeline;
  private isFormingLogo: boolean = false;

  constructor(canvas: HTMLCanvasElement, private config: AnimationConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.timeline = gsap.timeline();
    this.initializeParticles();
    this.createConnections();
  }

  private initializeParticles(): void {
    const { particleCount, colors } = this.config;
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        id: `particle_${i}`,
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        targetX: 0,
        targetY: 0,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.8 + 0.2,
        glowIntensity: Math.random() * 0.5 + 0.5
      });
    }
  }

  private createConnections(): void {
    // Criar conexões entre partículas próximas
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100 && Math.random() < 0.1) {
          this.connections.push([i, j]);
        }
      }
    }
  }

  public async loadLogo(svgContent: string): Promise<void> {
    const logoPoints = await SVGParser.parseToPoints(svgContent);
    this.setLogoTargets(logoPoints);
  }

  private setLogoTargets(logoPoints: Array<{x: number, y: number}>): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.particles.forEach((particle, index) => {
      if (index < logoPoints.length) {
        particle.targetX = centerX + logoPoints[index].x;
        particle.targetY = centerY + logoPoints[index].y;
      } else {
        // Partículas extras ficam em posições aleatórias ao redor da logo
        const angle = (index / this.particles.length) * Math.PI * 2;
        const radius = 200 + Math.random() * 100;
        particle.targetX = centerX + Math.cos(angle) * radius;
        particle.targetY = centerY + Math.sin(angle) * radius;
      }
    });
  }

  public start(): void {
    this.animate();
    
    // Sequência de animação com GSAP
    this.timeline
      .to({}, { duration: 2 }) // Fase inicial - partículas flutuantes
      .call(() => this.startLogoFormation())
      .to({}, { duration: 4 }) // Fase de formação da logo
      .call(() => this.startGlowEffect())
      .to({}, { duration: 2 }); // Fase final com efeitos
  }

  private animate(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Atualizar posições das partículas
    this.updateParticles();
    
    // Renderizar conexões
    this.renderConnections();
    
    // Renderizar partículas
    this.renderParticles();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private updateParticles(): void {
    this.particles.forEach(particle => {
      if (this.isFormingLogo) {
        // Movimento direcionado para a logo
        const dx = particle.targetX - particle.x;
        const dy = particle.targetY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
          particle.vx += (dx / distance) * 0.1;
          particle.vy += (dy / distance) * 0.1;
        }
        
        // Aplicar fricção
        particle.vx *= 0.95;
        particle.vy *= 0.95;
      } else {
        // Movimento orgânico aleatório
        particle.vx += (Math.random() - 0.5) * 0.1;
        particle.vy += (Math.random() - 0.5) * 0.1;
        
        // Limitar velocidade
        const maxSpeed = 2;
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (speed > maxSpeed) {
          particle.vx = (particle.vx / speed) * maxSpeed;
          particle.vy = (particle.vy / speed) * maxSpeed;
        }
      }
      
      // Atualizar posição
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Manter partículas dentro dos limites
      if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
    });
  }

  private renderConnections(): void {
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    this.connections.forEach(([i, j]) => {
      const p1 = this.particles[i];
      const p2 = this.particles[j];
      
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 150) {
        const opacity = 1 - (distance / 150);
        this.ctx.strokeStyle = `rgba(0, 255, 255, ${opacity * 0.3})`;
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    });
  }

  private renderParticles(): void {
    this.particles.forEach(particle => {
      // Efeito de brilho
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 3
      );
      
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(0.5, `${particle.color}80`);
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Núcleo da partícula
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private startLogoFormation(): void {
    this.isFormingLogo = true;
    
    // Animar formação da logo com GSAP
    this.particles.forEach((particle, index) => {
      gsap.to(particle, {
        x: particle.targetX,
        y: particle.targetY,
        duration: 3 + Math.random() * 2,
        ease: "power2.inOut",
        delay: index * 0.01
      });
    });
  }

  private startGlowEffect(): void {
    // Efeito de pulsação final
    gsap.to(this.particles, {
      glowIntensity: 2,
      duration: 1,
      yoyo: true,
      repeat: 3,
      ease: "power2.inOut"
    });
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.timeline.kill();
  }
}
```

## 4. Parser de SVG para Pontos

```typescript
// src/utils/SVGParser.ts
export class SVGParser {
  public static async parseToPoints(svgContent: string): Promise<Array<{x: number, y: number}>> {
    return new Promise((resolve) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svg = svgDoc.querySelector('svg');
      
      if (!svg) {
        resolve([]);
        return;
      }
      
      // Criar canvas temporário para extrair pontos
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      
      tempCanvas.width = 400;
      tempCanvas.height = 200;
      
      // Converter SVG para imagem
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      
      img.onload = () => {
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const points: Array<{x: number, y: number}> = [];
        
        // Extrair pontos de pixels não transparentes
        for (let y = 0; y < tempCanvas.height; y += 2) {
          for (let x = 0; x < tempCanvas.width; x += 2) {
            const index = (y * tempCanvas.width + x) * 4;
            const alpha = imageData.data[index + 3];
            
            if (alpha > 128) {
              points.push({
                x: x - tempCanvas.width / 2,
                y: y - tempCanvas.height / 2
              });
            }
          }
        }
        
        URL.revokeObjectURL(url);
        resolve(this.optimizePoints(points));
      };
      
      img.src = url;
    });
  }
  
  private static optimizePoints(points: Array<{x: number, y: number}>): Array<{x: number, y: number}> {
    // Reduzir densidade de pontos para melhor performance
    const optimized: Array<{x: number, y: number}> = [];
    const minDistance = 5;
    
    points.forEach(point => {
      const tooClose = optimized.some(existing => {
        const dx = existing.x - point.x;
        const dy = existing.y - point.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      });
      
      if (!tooClose) {
        optimized.push(point);
      }
    });
    
    return optimized;
  }
}
```

## 5. Efeitos CSS Avançados

```css
/* src/styles/effects.css */
.particle-glow-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at center,
    rgba(0, 255, 255, 0.1) 0%,
    rgba(26, 11, 61, 0.3) 50%,
    transparent 100%
  );
  pointer-events: none;
  animation: pulse-glow 4s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* Efeitos de brilho para partículas */
.particle {
  filter: drop-shadow(0 0 10px currentColor);
  animation: particle-twinkle 2s ease-in-out infinite;
}

@keyframes particle-twinkle {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
    filter: drop-shadow(0 0 15px currentColor);
  }
}

/* Efeito de formação da logo */
.logo-formation {
  animation: logo-emerge 3s ease-out forwards;
}

@keyframes logo-emerge {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(180deg);
    filter: blur(10px);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.8) rotate(90deg);
    filter: blur(5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    filter: blur(0px);
  }
}
```

## 6. Hook Personalizado para Animação

```typescript
// src/hooks/useParticleAnimation.ts
import { useState, useCallback, useRef } from 'react';
import { ParticleSystem } from '../utils/ParticleSystem';

export const useParticleAnimation = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const particleSystemRef = useRef<ParticleSystem | null>(null);

  const startAnimation = useCallback((canvas: HTMLCanvasElement, config: AnimationConfig, logoSvg: string) => {
    if (particleSystemRef.current) {
      particleSystemRef.current.destroy();
    }

    particleSystemRef.current = new ParticleSystem(canvas, config);
    particleSystemRef.current.loadLogo(logoSvg).then(() => {
      particleSystemRef.current?.start();
      setIsAnimating(true);
    });
  }, []);

  const stopAnimation = useCallback(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.destroy();
      particleSystemRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  const restartAnimation = useCallback((canvas: HTMLCanvasElement, config: AnimationConfig, logoSvg: string) => {
    stopAnimation();
    setTimeout(() => {
      startAnimation(canvas, config, logoSvg);
    }, 100);
  }, [startAnimation, stopAnimation]);

  return {
    isAnimating,
    startAnimation,
    stopAnimation,
    restartAnimation
  };
};
```

## 7. Otimizações de Performance

### 7.1 Técnicas de Otimização

- **Pooling de Objetos**: Reutilizar objetos de partículas para evitar garbage collection
- **Culling**: Não renderizar partículas fora da tela
- **LOD (Level of Detail)**: Reduzir qualidade em dispositivos menos potentes
- **RequestAnimationFrame**: Sincronizar com refresh rate do monitor
- **WebGL**: Usar aceleração de hardware quando disponível

### 7.2 Configurações Adaptativas

```typescript
// Detectar capacidade do dispositivo
const getOptimalConfig = (): AnimationConfig => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency < 4;
  
  return {
    particleCount: isMobile ? 500 : isLowEnd ? 1000 : 2000,
    animationSpeed: isMobile ? 0.8 : 1.0,
    colors: ['#00FFFF', '#1A0B3D', '#FFFFFF'],
    duration: 8000,
    autoPlay: true,
    createdAt: new Date()
  };
};
```

Esta implementação fornece uma base sólida para criar a animação de partículas descrita, com todas as funcionalidades principais e otimizações necessárias para uma experiência fluida em diferentes dispositivos.