import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '../utils/cn';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ParticleSystemProps {
  className?: string;
  width?: number;
  height?: number;
  particleCount?: number;
  particleColor?: string;
  particleSize?: number;
  speed?: number;
  opacity?: number;
  interactive?: boolean;
  connectionDistance?: number;
  showConnections?: boolean;
  animationSpeed?: number;
  style?: React.CSSProperties;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  className,
  width = 800,
  height = 600,
  particleCount = 50,
  particleColor = '#3b82f6',
  particleSize = 2,
  speed = 1,
  opacity = 0.6,
  interactive = true,
  connectionDistance = 100,
  showConnections = true,
  animationSpeed = 60,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize particles
  const initializeParticles = useCallback(() => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: particleSize + Math.random() * 2,
        opacity: opacity * (0.5 + Math.random() * 0.5),
        color: particleColor,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 100
      });
    }
    
    particlesRef.current = particles;
  }, [particleCount, width, height, speed, particleSize, opacity, particleColor]);

  // Update particle positions
  const updateParticles = useCallback(() => {
    const particles = particlesRef.current;
    
    particles.forEach(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Bounce off walls
      if (particle.x <= 0 || particle.x >= width) {
        particle.vx *= -1;
        particle.x = Math.max(0, Math.min(width, particle.x));
      }
      if (particle.y <= 0 || particle.y >= height) {
        particle.vy *= -1;
        particle.y = Math.max(0, Math.min(height, particle.y));
      }
      
      // Update life
      particle.life += 1;
      if (particle.life > particle.maxLife) {
        particle.life = 0;
        particle.x = Math.random() * width;
        particle.y = Math.random() * height;
      }
      
      // Interactive mouse effect
      if (interactive) {
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const force = (100 - distance) / 100;
          particle.vx += (dx / distance) * force * 0.01;
          particle.vy += (dy / distance) * force * 0.01;
        }
      }
      
      // Apply friction
      particle.vx *= 0.99;
      particle.vy *= 0.99;
    });
  }, [width, height, interactive]);

  // Draw particles and connections
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const particles = particlesRef.current;
    
    // Draw connections
    if (showConnections) {
      ctx.strokeStyle = particleColor;
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < connectionDistance) {
            const alpha = (1 - distance / connectionDistance) * opacity * 0.5;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }
    
    // Draw particles
    particles.forEach(particle => {
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  }, [width, height, particleColor, opacity, showConnections, connectionDistance]);

  // Animation loop
  const animate = useCallback(() => {
    if (!isPaused && isVisible) {
      updateParticles();
      draw();
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [updateParticles, draw, isPaused, isVisible]);

  // Handle mouse movement
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !interactive) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, [interactive]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Initialize and start animation
  useEffect(() => {
    initializeParticles();
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializeParticles, animate]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width;
    canvas.height = height;
    initializeParticles();
  }, [width, height, initializeParticles]);

  return (
    <div className={cn('relative', className)} style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        className="absolute inset-0 pointer-events-auto"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: width,
          maxHeight: height
        }}
      />
      
      {/* Controls */}
      <div className="absolute top-2 right-2 flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="px-2 py-1 text-xs bg-black/20 text-white rounded hover:bg-black/40 transition-colors"
        >
          {isPaused ? 'Play' : 'Pause'}
        </button>
        <button
          onClick={initializeParticles}
          className="px-2 py-1 text-xs bg-black/20 text-white rounded hover:bg-black/40 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

// Hook for particle system management
export const useParticleSystem = (config: Partial<ParticleSystemProps> = {}) => {
  const [isActive, setIsActive] = useState(true);
  const [performance, setPerformance] = useState({ fps: 0, particles: 0 });
  
  const toggleActive = () => setIsActive(!isActive);
  
  const updatePerformance = (fps: number, particleCount: number) => {
    setPerformance({ fps, particles: particleCount });
  };
  
  return {
    isActive,
    toggleActive,
    performance,
    updatePerformance,
    config: {
      particleCount: 30,
      speed: 0.5,
      opacity: 0.4,
      ...config
    }
  };
};

export default ParticleSystem;