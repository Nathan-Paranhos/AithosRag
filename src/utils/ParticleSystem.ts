export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  animating: boolean;
  targetX?: number;
  targetY?: number;
  type: 'text' | 'connection' | 'brain' | 'circuit' | 'energy';
  energy: number;
  pulsePhase: number;
  glowIntensity: number;
}

export interface ParticleSystemConfig {
  particleCount: number;
  particleSize: number;
  canvasWidth: number;
  canvasHeight: number;
  connectionDistance: number;
  animationSpeed: number;
  particleColor?: string;
  speed?: number;
  glowEffect?: boolean;
}

const defaultConfig: ParticleSystemConfig = {
  particleCount: 200,
  particleSize: 2,
  canvasWidth: 800,
  canvasHeight: 600,
  connectionDistance: 100,
  animationSpeed: 0.5,
  particleColor: '#3b82f6',
  speed: 0.3,
  glowEffect: true
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private isAnimating = false;
  private targetPoints: { x: number; y: number }[] = [];
  private isForming = false;
  private isDispersing = false;
  private config: ParticleSystemConfig;
  private logoPoints: { x: number; y: number }[] = [];
  private isFormed = false;
  private startTime = 0;
  private isMobile = false;
  private frameCount = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, config: Partial<ParticleSystemConfig>) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // Usar as dimensões reais do canvas
    const canvasConfig = {
      ...defaultConfig,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      ...config
    };
    
    this.config = canvasConfig;
    
    // Detectar se é mobile para otimizações
    this.isMobile = this.config.canvasWidth < 768;
    
    this.initializeParticles();
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const types: ('text' | 'connection' | 'brain' | 'circuit' | 'energy')[] = ['text', 'connection', 'brain', 'circuit', 'energy'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let size = this.config.particleSize;
    let opacity = 0.7;
    
    // Diferentes tamanhos e opacidades baseados no tipo
    switch (type) {
      case 'text':
        size = this.config.particleSize * 1.5;
        opacity = 0.9;
        break;
      case 'brain':
        size = this.config.particleSize * 1.2;
        opacity = 0.8;
        break;
      case 'energy':
        size = this.config.particleSize * 0.8;
        opacity = 1.0;
        break;
      case 'connection':
        size = this.config.particleSize * 0.6;
        opacity = 0.6;
        break;
      case 'circuit':
        size = this.config.particleSize * 0.7;
        opacity = 0.7;
        break;
    }
    
    return {
      x: Math.random() * this.config.canvasWidth,
      y: Math.random() * this.config.canvasHeight,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: size + Math.random() * 2,
      opacity: opacity + Math.random() * 0.2,
      life: Math.floor(Math.random() * 100),
      maxLife: 100 + Math.floor(Math.random() * 100),
      animating: false,
      type,
      energy: Math.random(),
      pulsePhase: Math.random() * Math.PI * 2,
      glowIntensity: 0.5 + Math.random() * 0.5
    };
  }



  public render(): void {
    if (!this.ctx) {
      console.warn('ParticleSystem: Contexto do canvas não definido');
      return;
    }
    
    if (!this.particles || this.particles.length === 0) {
      console.warn('ParticleSystem: Nenhuma partícula para renderizar');
      return;
    }
    
    this.frameCount++;
    
    // Limpar canvas
    this.ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
    
    // Desenhar conexões neurais primeiro (fundo)
    this.drawNeuralConnections();
    
    // Desenhar partículas por camadas (conexões primeiro, depois texto)
    const layers = {
      connection: this.particles.filter(p => p.type === 'connection'),
      circuit: this.particles.filter(p => p.type === 'circuit'),
      energy: this.particles.filter(p => p.type === 'energy'),
      brain: this.particles.filter(p => p.type === 'brain'),
      text: this.particles.filter(p => p.type === 'text')
    };
    
    // Renderizar cada camada
    Object.values(layers).forEach((particles) => {
      particles.forEach(particle => {
        this.renderParticle(particle);
      });
    });
  }
  
  private renderParticle(particle: Particle): void {
    if (!this.ctx || !particle) return;
    
    this.ctx.save();
    
    // Calcular efeitos de pulsação e energia
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * 2 + particle.pulsePhase) * 0.3 + 0.7;
    const energyPulse = Math.sin(time * 3 + particle.energy * Math.PI * 2) * 0.2 + 0.8;
    
    // Configurar cores e efeitos baseados no tipo
    let colors: { inner: string; middle: string; outer: string; shadow: string };
    let glowSize = 15;
    let size = particle.size * pulse;
    
    switch (particle.type) {
      case 'text':
        colors = {
          inner: `rgba(147, 197, 253, ${particle.opacity * energyPulse})`,
          middle: `rgba(59, 130, 246, ${particle.opacity * 0.8})`,
          outer: `rgba(29, 78, 216, 0)`,
          shadow: '#60a5fa'
        };
        glowSize = 20;
        size *= 1.1;
        break;
      case 'brain':
        colors = {
          inner: `rgba(147, 197, 253, ${particle.opacity * energyPulse})`,
          middle: `rgba(59, 130, 246, ${particle.opacity * 0.8})`,
          outer: `rgba(29, 78, 216, 0)`,
          shadow: '#3b82f6'
        };
        glowSize = 18;
        break;
      case 'energy':
        colors = {
          inner: `rgba(96, 165, 250, ${particle.opacity * energyPulse})`,
          middle: `rgba(59, 130, 246, ${particle.opacity * 0.9})`,
          outer: `rgba(29, 78, 216, 0)`,
          shadow: '#60a5fa'
        };
        glowSize = 25;
        size *= energyPulse;
        break;
      case 'connection':
        colors = {
          inner: `rgba(147, 197, 253, ${particle.opacity * 0.6})`,
          middle: `rgba(59, 130, 246, ${particle.opacity * 0.4})`,
          outer: `rgba(29, 78, 216, 0)`,
          shadow: '#3b82f6'
        };
        glowSize = 10;
        break;
      case 'circuit':
        colors = {
          inner: `rgba(96, 165, 250, ${particle.opacity * energyPulse})`,
          middle: `rgba(59, 130, 246, ${particle.opacity * 0.7})`,
          outer: `rgba(29, 78, 216, 0)`,
          shadow: '#60a5fa'
        };
        glowSize = 12;
        break;
      default:
        colors = {
          inner: `rgba(147, 197, 253, ${particle.opacity})`,
          middle: `rgba(59, 130, 246, ${particle.opacity * 0.8})`,
          outer: `rgba(29, 78, 216, 0)`,
          shadow: '#3b82f6'
        };
    }
    
    // Efeito de brilho
    this.ctx.shadowBlur = glowSize * particle.glowIntensity;
    this.ctx.shadowColor = colors.shadow;
    
    // Gradiente radial para cada partícula
    const gradient = this.ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, size * 2
    );
    gradient.addColorStop(0, colors.inner);
    gradient.addColorStop(0.7, colors.middle);
    gradient.addColorStop(1, colors.outer);
    
    this.ctx.fillStyle = gradient;
    
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Efeito adicional para partículas de energia (simplificado em mobile)
    if (particle.type === 'energy' && !this.isMobile) {
      this.ctx.shadowBlur = 5;
      this.ctx.strokeStyle = colors.shadow;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, size * 1.5, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  private drawNeuralConnections(): void {
    if (!this.ctx) return;
    if (!this.particles || this.particles.length < 2) return;
    
    // Pular conexões neurais em mobile para melhor performance
    if (this.isMobile && this.frameCount % 3 !== 0) return;
    
    this.ctx.save();
    
    const time = Date.now() * 0.001;
    
    // Filtrar partículas que podem formar conexões
    const connectableParticles = this.particles.filter(p => 
      p.type === 'brain' || p.type === 'text' || p.type === 'circuit'
    );
    
    // Draw connections between nearby particles
    for (let i = 0; i < connectableParticles.length; i++) {
      const particle1 = connectableParticles[i];
      
      if (!particle1) continue;
      
      for (let j = i + 1; j < connectableParticles.length; j++) {
        const particle2 = connectableParticles[j];
        
        if (!particle2) continue;
        const dx = particle2.x - particle1.x;
        const dy = particle2.y - particle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Distância máxima baseada nos tipos de partículas
        let maxDistance = 120;
        if (particle1.type === 'text' && particle2.type === 'text') maxDistance = 150;
        if (particle1.type === 'brain' || particle2.type === 'brain') maxDistance = 100;
        
        // Only draw connections for nearby particles
        if (distance < maxDistance) {
          const opacity = Math.max(0, 1 - distance / maxDistance);
          const glowIntensity = opacity * 0.8;
          
          // Cores baseadas nos tipos de partículas conectadas - todas azuis
          let connectionColor = { r: 59, g: 130, b: 246 }; // azul padrão
          if (particle1.type === 'brain' || particle2.type === 'brain') {
            connectionColor = { r: 59, g: 130, b: 246 }; // azul para brain
          } else if (particle1.type === 'text' && particle2.type === 'text') {
            connectionColor = { r: 147, g: 197, b: 253 }; // azul claro para texto
          } else if (particle1.type === 'circuit' || particle2.type === 'circuit') {
            connectionColor = { r: 96, g: 165, b: 250 }; // azul médio para circuito
          }
          
          // Efeito de brilho pulsante
          const pulseIntensity = Math.sin(time * 2 + distance * 0.01) * 0.3 + 0.7;
          this.ctx.shadowBlur = 15 * pulseIntensity;
          this.ctx.shadowColor = `rgb(${connectionColor.r}, ${connectionColor.g}, ${connectionColor.b})`;
          
          // Create gradient for the connection
          const gradient = this.ctx.createLinearGradient(particle1.x, particle1.y, particle2.x, particle2.y);
          gradient.addColorStop(0, `rgba(${connectionColor.r}, ${connectionColor.g}, ${connectionColor.b}, ${glowIntensity * pulseIntensity})`);
          gradient.addColorStop(0.5, `rgba(${Math.min(255, connectionColor.r + 50)}, ${Math.min(255, connectionColor.g + 50)}, ${Math.min(255, connectionColor.b + 50)}, ${glowIntensity * 1.5 * pulseIntensity})`);
          gradient.addColorStop(1, `rgba(${connectionColor.r}, ${connectionColor.g}, ${connectionColor.b}, ${glowIntensity * pulseIntensity})`);
          
          this.ctx.strokeStyle = gradient;
          this.ctx.lineWidth = (1 + opacity * 2) * pulseIntensity;
          
          this.ctx.beginPath();
          this.ctx.moveTo(particle1.x, particle1.y);
          this.ctx.lineTo(particle2.x, particle2.y);
          this.ctx.stroke();
          
          // Desenhar pulsos de energia percorrendo a conexão
          this.drawEnergyPulse(particle1, particle2, time, distance, connectionColor, opacity);
        }
      }
    }
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }
  
  private drawEnergyPulse(
    particle1: Particle, 
    particle2: Particle, 
    time: number, 
    distance: number, 
    color: { r: number; g: number; b: number }, 
    opacity: number
  ): void {
    if (!this.ctx) return;
    
    // Calcular posição do pulso ao longo da linha
    const pulseSpeed = 2; // velocidade do pulso
    const pulsePosition = (time * pulseSpeed + distance * 0.01) % 1;
    
    const pulseX = particle1.x + (particle2.x - particle1.x) * pulsePosition;
    const pulseY = particle1.y + (particle2.y - particle1.y) * pulsePosition;
    
    // Desenhar o pulso de energia
    this.ctx.save();
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    
    const pulseSize = 3 + Math.sin(time * 4) * 1;
    const pulseOpacity = opacity * 0.8;
    
    // Gradiente radial para o pulso
    const pulseGradient = this.ctx.createRadialGradient(
      pulseX, pulseY, 0,
      pulseX, pulseY, pulseSize * 2
    );
    pulseGradient.addColorStop(0, `rgba(255, 255, 255, ${pulseOpacity})`);
    pulseGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${pulseOpacity * 0.8})`);
    pulseGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    
    this.ctx.fillStyle = pulseGradient;
    this.ctx.beginPath();
    this.ctx.arc(pulseX, pulseY, pulseSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  public setTargetPoints(points: { x: number; y: number }[]): void {
    this.logoPoints = points;
  }

  public startAnimation(): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.startTime = Date.now();
    this.animate();
  }

  public startFloatingAnimation(): void {
    this.startAnimation();
  }

  public stopAnimation(): void {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public formLogo(points: { x: number; y: number }[]): void {
    this.logoPoints = points;
    this.isFormed = true;
    
    this.particles.forEach((particle, index) => {
      const targetPoint = points[index % points.length];
      particle.animating = true;
      particle.targetX = targetPoint.x;
      particle.targetY = targetPoint.y;
    });
  }

  public disperseParticles(): void {
    this.isFormed = false;
    
    this.particles.forEach((particle) => {
      particle.animating = true;
      particle.targetX = Math.random() * this.config.canvasWidth;
      particle.targetY = Math.random() * this.config.canvasHeight;
      
      // After reaching target, stop animating
      setTimeout(() => {
        particle.animating = false;
        particle.targetX = undefined;
        particle.targetY = undefined;
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = (Math.random() - 0.5) * 2;
      }, 2000);
    });
  }

  private resetParticles(): void {
    this.particles.forEach((particle) => {
      particle.animating = false;
      particle.targetX = undefined;
      particle.targetY = undefined;
      particle.x = Math.random() * this.config.canvasWidth;
      particle.y = Math.random() * this.config.canvasHeight;
      particle.vx = (Math.random() - 0.5) * 2;
      particle.vy = (Math.random() - 0.5) * 2;
      particle.opacity = 0.7 + Math.random() * 0.3;
      particle.life = 0;
      particle.energy = Math.random();
      particle.pulsePhase = Math.random() * Math.PI * 2;
      particle.glowIntensity = 0.5 + Math.random() * 0.5;
    });
  }

  private animate(): void {
    if (!this.isAnimating) return;

    this.updateParticles();
    this.render();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private updateParticles(): void {
    if (!this.particles || this.particles.length === 0) {
      console.warn('ParticleSystem: Nenhuma partícula disponível para atualizar');
      return;
    }
    
    const time = Date.now() * 0.001;
    
    this.particles.forEach(particle => {
      if (!particle) return;
      
      // Atualizar fase de pulsação e energia
      particle.pulsePhase += 0.02;
      particle.energy = Math.sin(time + particle.pulsePhase) * 0.5 + 0.5;
      
      if (!particle.animating) {
        // Movimento baseado no tipo de partícula
        let moveSpeed = 0.1;
        switch (particle.type) {
          case 'energy':
            moveSpeed = 0.3; // Partículas de energia se movem mais rápido
            break;
          case 'connection':
            moveSpeed = 0.05; // Conexões se movem mais devagar
            break;
          case 'text':
            moveSpeed = 0.02; // Texto quase estático
            break;
        }
        
        // Movimento flutuante natural
        particle.vx += (Math.random() - 0.5) * moveSpeed;
        particle.vy += (Math.random() - 0.5) * moveSpeed;
        
        // Limitar velocidade baseada no tipo
        const maxSpeed = particle.type === 'energy' ? 3 : 2;
        particle.vx = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vx));
        particle.vy = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vy));
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Manter partículas dentro dos limites
        if (particle.x < 0 || particle.x > this.config.canvasWidth) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(this.config.canvasWidth, particle.x));
        }
        if (particle.y < 0 || particle.y > this.config.canvasHeight) {
          particle.vy *= -0.8;
          particle.y = Math.max(0, Math.min(this.config.canvasHeight, particle.y));
        }
      } else if (particle.targetX !== undefined && particle.targetY !== undefined) {
        // Animate towards target com velocidade baseada no tipo
        const dx = particle.targetX - particle.x;
        const dy = particle.targetY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let animSpeed = 0.05;
        if (particle.type === 'energy') animSpeed = 0.08;
        if (particle.type === 'text') animSpeed = 0.03;
        
        if (distance > 1) {
          particle.x += dx * animSpeed;
          particle.y += dy * animSpeed;
        } else {
          particle.x = particle.targetX;
          particle.y = particle.targetY;
        }
      }
      
      // Atualizar ciclo de vida
      particle.life = (particle.life + 1) % particle.maxLife;
      
      // Atualizar intensidade do brilho baseada na energia
      particle.glowIntensity = 0.5 + particle.energy * 0.5;
      
      // Efeito de pulsação sutil baseado no tipo
      let pulseFactor = 0.1;
      if (particle.type === 'energy') pulseFactor = 0.3;
      if (particle.type === 'brain') pulseFactor = 0.15;
      
      const pulse = Math.sin(particle.life * 0.1 + particle.pulsePhase) * pulseFactor + (1 - pulseFactor);
      const baseSize = particle.type === 'text' ? this.config.particleSize * 1.5 :
                      particle.type === 'brain' ? this.config.particleSize * 1.2 :
                      particle.type === 'energy' ? this.config.particleSize * 0.8 :
                      particle.type === 'connection' ? this.config.particleSize * 0.6 :
                      this.config.particleSize * 0.7;
      
      particle.size = baseSize * pulse;
    });
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public updateConfig(newConfig: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.particleCount && newConfig.particleCount !== this.particles.length) {
      this.initializeParticles();
    }
  }

  public destroy(): void {
    this.stopAnimation();
    this.particles = [];
  }
}

export type { ParticleSystemConfig };