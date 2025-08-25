import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';

interface GestureEvent {
  type: 'swipe' | 'pinch' | 'tap' | 'longpress' | 'rotate';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  scale?: number;
  rotation?: number;
  touches: number;
  clientX: number;
  clientY: number;
  timestamp: number;
}

interface GestureConfig {
  swipeThreshold: number;
  pinchThreshold: number;
  longPressDelay: number;
  tapTimeout: number;
  rotationThreshold: number;
  enableSwipe: boolean;
  enablePinch: boolean;
  enableTap: boolean;
  enableLongPress: boolean;
  enableRotation: boolean;
}

interface GestureNavigationProps {
  children: React.ReactNode;
  className?: string;
  onGesture?: (gesture: GestureEvent) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onTap?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onRotate?: (rotation: number) => void;
  config?: Partial<GestureConfig>;
  showIndicators?: boolean;
}

const defaultConfig: GestureConfig = {
  swipeThreshold: 50,
  pinchThreshold: 0.1,
  longPressDelay: 500,
  tapTimeout: 300,
  rotationThreshold: 15,
  enableSwipe: true,
  enablePinch: true,
  enableTap: true,
  enableLongPress: true,
  enableRotation: true
};

export const GestureNavigation: React.FC<GestureNavigationProps> = ({
  children,
  className,
  onGesture,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchIn,
  onPinchOut,
  onTap,
  onDoubleTap,
  onLongPress,
  onRotate,
  config = {},
  showIndicators = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureConfig = { ...defaultConfig, ...config };
  
  // Touch tracking state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [lastTap, setLastTap] = useState<{ x: number; y: number; time: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialRotation, setInitialRotation] = useState<number | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [gestureIndicator, setGestureIndicator] = useState<string | null>(null);

  // Helper functions
  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getRotation = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

  const getCenter = (touches: TouchList): { x: number; y: number } => {
    let x = 0, y = 0;
    for (let i = 0; i < touches.length; i++) {
      x += touches[i].clientX;
      y += touches[i].clientY;
    }
    return { x: x / touches.length, y: y / touches.length };
  };

  const showGestureIndicator = useCallback((gesture: string) => {
    if (!showIndicators) return;
    setGestureIndicator(gesture);
    setTimeout(() => setGestureIndicator(null), 1000);
  }, [showIndicators]);

  const emitGesture = useCallback((gesture: GestureEvent) => {
    onGesture?.(gesture);
  }, [onGesture]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = e.touches;
    const now = Date.now();
    
    if (touches.length === 1) {
      const touch = touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY, time: now });
      setCurrentGesture('touch');
      
      // Long press detection
      if (gestureConfig.enableLongPress) {
        const timer = setTimeout(() => {
          onLongPress?.(touch.clientX, touch.clientY);
          emitGesture({
            type: 'longpress',
            touches: 1,
            clientX: touch.clientX,
            clientY: touch.clientY,
            timestamp: Date.now()
          });
          showGestureIndicator('Long Press');
        }, gestureConfig.longPressDelay);
        setLongPressTimer(timer);
      }
    } else if (touches.length === 2) {
      setCurrentGesture('multi-touch');
      
      if (gestureConfig.enablePinch) {
        setInitialDistance(getDistance(touches[0], touches[1]));
      }
      
      if (gestureConfig.enableRotation) {
        setInitialRotation(getRotation(touches[0], touches[1]));
      }
    }
  }, [gestureConfig, onLongPress, emitGesture, showGestureIndicator]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 2 && (gestureConfig.enablePinch || gestureConfig.enableRotation)) {
      const currentDistance = getDistance(touches[0], touches[1]);
      const currentRotation = getRotation(touches[0], touches[1]);
      
      // Pinch detection
      if (gestureConfig.enablePinch && initialDistance) {
        const scale = currentDistance / initialDistance;
        const scaleChange = Math.abs(scale - 1);
        
        if (scaleChange > gestureConfig.pinchThreshold) {
          const center = getCenter(touches);
          
          if (scale > 1) {
            onPinchOut?.(scale);
            showGestureIndicator('Pinch Out');
          } else {
            onPinchIn?.(scale);
            showGestureIndicator('Pinch In');
          }
          
          emitGesture({
            type: 'pinch',
            scale,
            touches: 2,
            clientX: center.x,
            clientY: center.y,
            timestamp: Date.now()
          });
        }
      }
      
      // Rotation detection
      if (gestureConfig.enableRotation && initialRotation !== null) {
        const rotationDiff = currentRotation - initialRotation;
        
        if (Math.abs(rotationDiff) > gestureConfig.rotationThreshold) {
          const center = getCenter(touches);
          onRotate?.(rotationDiff);
          emitGesture({
            type: 'rotate',
            rotation: rotationDiff,
            touches: 2,
            clientX: center.x,
            clientY: center.y,
            timestamp: Date.now()
          });
          showGestureIndicator(`Rotate ${rotationDiff > 0 ? 'Right' : 'Left'}`);
        }
      }
    }
  }, [gestureConfig, initialDistance, initialRotation, onPinchIn, onPinchOut, onRotate, emitGesture, showGestureIndicator]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const now = Date.now();
    
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (touchStart && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = now - touchStart.time;
      
      // Swipe detection
      if (gestureConfig.enableSwipe && distance > gestureConfig.swipeThreshold) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        let direction: 'left' | 'right' | 'up' | 'down';
        
        if (absX > absY) {
          direction = deltaX > 0 ? 'right' : 'left';
          if (direction === 'left') {
            onSwipeLeft?.();
            showGestureIndicator('Swipe Left');
          } else {
            onSwipeRight?.();
            showGestureIndicator('Swipe Right');
          }
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
          if (direction === 'up') {
            onSwipeUp?.();
            showGestureIndicator('Swipe Up');
          } else {
            onSwipeDown?.();
            showGestureIndicator('Swipe Down');
          }
        }
        
        emitGesture({
          type: 'swipe',
          direction,
          distance,
          touches: 1,
          clientX: touch.clientX,
          clientY: touch.clientY,
          timestamp: now
        });
      }
      // Tap detection
      else if (gestureConfig.enableTap && distance < gestureConfig.swipeThreshold && duration < gestureConfig.tapTimeout) {
        // Double tap detection
        if (lastTap && 
            Math.abs(touch.clientX - lastTap.x) < 50 && 
            Math.abs(touch.clientY - lastTap.y) < 50 && 
            now - lastTap.time < 300) {
          onDoubleTap?.(touch.clientX, touch.clientY);
          emitGesture({
            type: 'tap',
            touches: 1,
            clientX: touch.clientX,
            clientY: touch.clientY,
            timestamp: now
          });
          showGestureIndicator('Double Tap');
          setLastTap(null);
        } else {
          setLastTap({ x: touch.clientX, y: touch.clientY, time: now });
          setTimeout(() => {
            onTap?.(touch.clientX, touch.clientY);
            emitGesture({
              type: 'tap',
              touches: 1,
              clientX: touch.clientX,
              clientY: touch.clientY,
              timestamp: now
            });
          }, 200);
        }
      }
    }
    
    // Reset state
    setTouchStart(null);
    setInitialDistance(null);
    setInitialRotation(null);
    setCurrentGesture(null);
  }, [touchStart, lastTap, longPressTimer, gestureConfig, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, emitGesture, showGestureIndicator]);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative touch-none select-none",
        currentGesture && "cursor-grabbing",
        className
      )}
      style={{ touchAction: 'none' }}
    >
      {children}
      
      {/* Gesture Indicator */}
      {showIndicators && gestureIndicator && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 animate-fade-in">
            {gestureIndicator.includes('Swipe Left') && <ChevronLeft className="w-4 h-4" />}
            {gestureIndicator.includes('Swipe Right') && <ChevronRight className="w-4 h-4" />}
            {gestureIndicator.includes('Swipe Up') && <ArrowUp className="w-4 h-4" />}
            {gestureIndicator.includes('Swipe Down') && <ArrowDown className="w-4 h-4" />}
            {gestureIndicator.includes('Rotate') && <RotateCcw className="w-4 h-4" />}
            {gestureIndicator}
          </div>
        </div>
      )}
      
      {/* Touch Visual Feedback */}
      {showIndicators && currentGesture && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className={cn(
            "absolute inset-0 transition-all duration-200",
            currentGesture === 'touch' && "bg-blue-500/5",
            currentGesture === 'multi-touch' && "bg-purple-500/5"
          )} />
        </div>
      )}
    </div>
  );
};

export default GestureNavigation;