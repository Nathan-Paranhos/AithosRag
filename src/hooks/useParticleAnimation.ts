import { useRef, useCallback, useState, useEffect } from 'react';
import { ParticleCanvasRef } from '../components/ParticleCanvas';

export interface UseParticleAnimationOptions {
  autoStart?: boolean;
  loopAnimation?: boolean;
  formationDelay?: number;
  onAnimationCycle?: () => void;
}

export interface UseParticleAnimationReturn {
  canvasRef: React.RefObject<ParticleCanvasRef>;
  isAnimating: boolean;
  isForming: boolean;
  isDispersing: boolean;
  startAnimation: () => void;
  stopAnimation: () => void;
  formLogo: (svgString?: string, text?: string) => Promise<void>;
  disperseParticles: () => Promise<void>;
  playSequence: (svgString?: string, text?: string) => Promise<void>;
  resetAnimation: () => void;
}

export const useParticleAnimation = (
  options: UseParticleAnimationOptions = {}
): UseParticleAnimationReturn => {
  const {
    autoStart = false,
    loopAnimation = false,
    formationDelay = 1000,
    disperseDelay = 3000,
    onAnimationCycle
  } = options;

  const canvasRef = useRef<ParticleCanvasRef>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isForming, setIsForming] = useState(false);
  const [isDispersing, setIsDispersing] = useState(false);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Iniciar animação
  const startAnimation = useCallback(() => {
    if (canvasRef.current && !isAnimating) {
      canvasRef.current.startAnimation();
      setIsAnimating(true);
    }
  }, [isAnimating]);

  // Parar animação
  const stopAnimation = useCallback(() => {
    if (canvasRef.current && isAnimating) {
      canvasRef.current.stopAnimation();
      setIsAnimating(false);
      setIsForming(false);
      setIsDispersing(false);
      
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
    }
  }, [isAnimating]);

  // Formar logo
  const formLogo = useCallback(async (svgString?: string, text?: string): Promise<void> => {
    if (!canvasRef.current || isForming) return;
    
    setIsForming(true);
    
    try {
      canvasRef.current.formLogo(svgString, text);
      // Aguardar um pouco para a animação de formação
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Erro ao formar logo:', error);
    } finally {
      setIsForming(false);
    }
  }, [isForming]);

  // Dispersar partículas
  const disperseParticles = useCallback(async (): Promise<void> => {
    if (!canvasRef.current || isDispersing) return;
    
    setIsDispersing(true);
    
    try {
      canvasRef.current.disperseParticles();
      // Aguardar um pouco para a animação de dispersão
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Erro ao dispersar partículas:', error);
    } finally {
      setIsDispersing(false);
    }
  }, [isDispersing]);

  // Executar sequência completa
  const playSequence = useCallback(async (svgString?: string, text?: string): Promise<void> => {
    if (!canvasRef.current) return;
    
    try {
      // Iniciar animação
      canvasRef.current.startAnimation();
      
      // Aguardar um pouco antes de formar o logo
      await new Promise(resolve => setTimeout(resolve, formationDelay));
      await formLogo(svgString, text);
      
      // Aguardar antes de dispersar
      await new Promise(resolve => setTimeout(resolve, disperseDelay));
      await disperseParticles();
      
      // Callback de ciclo completo
      if (onAnimationCycle) {
        onAnimationCycle();
      }
      
      // Loop se habilitado
      if (loopAnimation) {
        setTimeout(() => playSequence(svgString, text), 1000);
      }
    } catch (error) {
      console.error('Erro na sequência de animação:', error);
    }
  }, [formLogo, disperseParticles, formationDelay, disperseDelay, loopAnimation, onAnimationCycle]);

  // Resetar animação
  const resetAnimation = useCallback((): void => {
    if (!canvasRef.current) return;
    
    try {
      canvasRef.current.stopAnimation();
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.startAnimation();
        }
      }, 100);
    } catch (error) {
      console.error('Erro ao resetar animação:', error);
    }
  }, []);

  // Efeito para auto-start
  useEffect(() => {
    if (autoStart && !isAnimating) {
      const timer = setTimeout(() => {
        startAnimation();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, isAnimating, startAnimation]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
    };
  }, []);

  return {
    canvasRef,
    isAnimating,
    isForming,
    isDispersing,
    startAnimation,
    stopAnimation,
    formLogo,
    disperseParticles,
    playSequence,
    resetAnimation
  };
};

// Hook para controle avançado de animação
export interface UseAdvancedParticleAnimationOptions extends UseParticleAnimationOptions {
  sequences?: Array<{
    type: 'form' | 'disperse' | 'wait';
    svgString?: string;
    text?: string;
    duration?: number;
  }>;
  repeatSequences?: boolean;
}

export const useAdvancedParticleAnimation = (
  options: UseAdvancedParticleAnimationOptions = {}
) => {
  const baseHook = useParticleAnimation(options);
  const { sequences = [], repeatSequences = false } = options;
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [isPlayingSequences, setIsPlayingSequences] = useState(false);

  // Executar sequências predefinidas
  const playSequences = useCallback(async (): Promise<void> => {
    if (sequences.length === 0 || isPlayingSequences) return;
    
    setIsPlayingSequences(true);
    setCurrentSequenceIndex(0);
    
    if (!baseHook.isAnimating) {
      baseHook.startAnimation();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    for (let i = 0; i < sequences.length; i++) {
      const sequence = sequences[i];
      setCurrentSequenceIndex(i);
      
      switch (sequence.type) {
        case 'form':
          await baseHook.formLogo(sequence.svgString, sequence.text);
          break;
        case 'disperse':
          await baseHook.disperseParticles();
          break;
        case 'wait':
          await new Promise(resolve => setTimeout(resolve, sequence.duration || 1000));
          break;
      }
      
      // Aguardar entre sequências
      if (i < sequences.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsPlayingSequences(false);
    
    // Repetir se configurado
    if (repeatSequences) {
      setTimeout(() => {
        playSequences();
      }, 1000);
    }
  }, [sequences, isPlayingSequences, repeatSequences, baseHook]);

  return {
    ...baseHook,
    playSequences,
    currentSequenceIndex,
    isPlayingSequences,
    totalSequences: sequences.length
  };
};