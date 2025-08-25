/**
 * Viewport Optimization Utilities
 * Otimizações críticas para performance mobile e responsividade
 */

import { useState, useEffect } from 'react';

// Configuração de viewport otimizada
export const VIEWPORT_CONFIG = {
  // Breakpoints otimizados para performance
  breakpoints: {
    xs: 320,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  },
  
  // Configurações de performance mobile
  mobile: {
    maxWidth: 768,
    touchTarget: 44, // Tamanho mínimo recomendado para touch
    scrollThreshold: 10,
    debounceDelay: 16 // ~60fps
  },
  
  // Configurações de animação baseadas no dispositivo
  animation: {
    reducedMotion: false,
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    }
  }
};

// Detecção de dispositivo otimizada
export const deviceDetection = {
  // Cache para evitar recálculos
  _cache: new Map<string, boolean>(),
  
  isMobile(): boolean {
    const key = 'isMobile';
    if (this._cache.has(key)) {
      return this._cache.get(key)!;
    }
    
    const result = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= VIEWPORT_CONFIG.mobile.maxWidth;
    
    this._cache.set(key, result);
    return result;
  },
  
  isTablet(): boolean {
    const key = 'isTablet';
    if (this._cache.has(key)) {
      return this._cache.get(key)!;
    }
    
    const result = /iPad|Android/i.test(navigator.userAgent) && 
                  window.innerWidth > VIEWPORT_CONFIG.mobile.maxWidth &&
                  window.innerWidth < VIEWPORT_CONFIG.breakpoints.lg;
    
    this._cache.set(key, result);
    return result;
  },
  
  isDesktop(): boolean {
    return !this.isMobile() && !this.isTablet();
  },
  
  // Limpar cache quando necessário
  clearCache(): void {
    this._cache.clear();
  }
};

// Hook para viewport responsivo
export const useViewport = () => {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: deviceDetection.isMobile(),
    isTablet: deviceDetection.isTablet(),
    isDesktop: deviceDetection.isDesktop()
  });
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Limpar cache de detecção
        deviceDetection.clearCache();
        
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: deviceDetection.isMobile(),
          isTablet: deviceDetection.isTablet(),
          isDesktop: deviceDetection.isDesktop()
        });
      }, VIEWPORT_CONFIG.mobile.debounceDelay);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);
  
  return viewport;
};

// Utilitários de viewport
export const viewportUtils = {
  // Verificar se está em uma breakpoint específica
  isBreakpoint(breakpoint: keyof typeof VIEWPORT_CONFIG.breakpoints): boolean {
    return window.innerWidth >= VIEWPORT_CONFIG.breakpoints[breakpoint];
  },
  
  // Obter breakpoint atual
  getCurrentBreakpoint(): string {
    const width = window.innerWidth;
    const { breakpoints } = VIEWPORT_CONFIG;
    
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  },
  
  // Calcular tamanho otimizado baseado no viewport
  getOptimalSize(baseSize: number, scaleFactor = 0.8): number {
    if (deviceDetection.isMobile()) {
      return Math.max(baseSize * scaleFactor, VIEWPORT_CONFIG.mobile.touchTarget);
    }
    return baseSize;
  },
  
  // Verificar se deve usar animações reduzidas
  shouldReduceMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
           deviceDetection.isMobile() && window.innerWidth < VIEWPORT_CONFIG.breakpoints.sm;
  },
  
  // Obter duração de animação otimizada
  getAnimationDuration(type: 'fast' | 'normal' | 'slow' = 'normal'): number {
    const duration = VIEWPORT_CONFIG.animation.duration[type];
    return this.shouldReduceMotion() ? duration * 0.5 : duration;
  }
};

// Configuração de meta viewport otimizada
export const setOptimalViewport = (): void => {
  // Verificar se já existe
  let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
  
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  
  // Configuração otimizada para performance e UX
  const config = [
    'width=device-width',
    'initial-scale=1.0',
    'maximum-scale=5.0', // Permitir zoom para acessibilidade
    'minimum-scale=1.0',
    'user-scalable=yes', // Importante para acessibilidade
    'viewport-fit=cover' // Para dispositivos com notch
  ];
  
  viewport.content = config.join(', ');
};

// Inicialização automática
if (typeof window !== 'undefined') {
  // Configurar viewport otimizado
  setOptimalViewport();
  
  // Detectar preferência de movimento reduzido
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  VIEWPORT_CONFIG.animation.reducedMotion = mediaQuery.matches;
  
  // Escutar mudanças na preferência
  mediaQuery.addEventListener('change', (e) => {
    VIEWPORT_CONFIG.animation.reducedMotion = e.matches;
  });
}