import { useRef, useEffect, RefObject } from 'react';

interface GestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  pinchThreshold?: number;
  longPressDelay?: number;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  startTouch: TouchPoint | null;
  lastTouch: TouchPoint | null;
  isLongPress: boolean;
  longPressTimer: NodeJS.Timeout | null;
  lastTapTime: number;
  tapCount: number;
  initialDistance: number;
  lastDistance: number;
}

export const useGestures = (options: GestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchIn,
    onPinchOut,
    onTap,
    onDoubleTap,
    onLongPress,
    swipeThreshold = 50,
    pinchThreshold = 0.2,
    longPressDelay = 500
  } = options;

  const ref = useRef<HTMLElement>(null);
  const gestureState = useRef<GestureState>({
    startTouch: null,
    lastTouch: null,
    isLongPress: false,
    longPressTimer: null,
    lastTapTime: 0,
    tapCount: 0,
    initialDistance: 0,
    lastDistance: 0
  });

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchPoint = (touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  });

  const clearLongPressTimer = () => {
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer);
      gestureState.current.longPressTimer = null;
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const touchPoint = getTouchPoint(touch);
    
    gestureState.current.startTouch = touchPoint;
    gestureState.current.lastTouch = touchPoint;
    gestureState.current.isLongPress = false;

    // Handle multi-touch for pinch gestures
    if (e.touches.length === 2) {
      gestureState.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      gestureState.current.lastDistance = gestureState.current.initialDistance;
    }

    // Start long press timer
    if (onLongPress) {
      gestureState.current.longPressTimer = setTimeout(() => {
        gestureState.current.isLongPress = true;
        onLongPress();
      }, longPressDelay);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!gestureState.current.startTouch) return;

    const touch = e.touches[0];
    const touchPoint = getTouchPoint(touch);
    gestureState.current.lastTouch = touchPoint;

    // Clear long press if user moves finger
    const dx = Math.abs(touchPoint.x - gestureState.current.startTouch.x);
    const dy = Math.abs(touchPoint.y - gestureState.current.startTouch.y);
    
    if (dx > 10 || dy > 10) {
      clearLongPressTimer();
    }

    // Handle pinch gestures
    if (e.touches.length === 2) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const distanceChange = currentDistance - gestureState.current.lastDistance;
      const scaleChange = currentDistance / gestureState.current.initialDistance;

      if (Math.abs(scaleChange - 1) > pinchThreshold) {
        if (scaleChange > 1 && onPinchOut) {
          onPinchOut();
        } else if (scaleChange < 1 && onPinchIn) {
          onPinchIn();
        }
      }

      gestureState.current.lastDistance = currentDistance;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    clearLongPressTimer();

    if (!gestureState.current.startTouch || !gestureState.current.lastTouch) {
      return;
    }

    const startTouch = gestureState.current.startTouch;
    const endTouch = gestureState.current.lastTouch;
    
    const dx = endTouch.x - startTouch.x;
    const dy = endTouch.y - startTouch.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = endTouch.timestamp - startTouch.timestamp;

    // Handle swipe gestures
    if (distance > swipeThreshold && duration < 500) {
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      if (Math.abs(angle) < 45) {
        // Swipe right
        onSwipeRight?.();
      } else if (Math.abs(angle) > 135) {
        // Swipe left
        onSwipeLeft?.();
      } else if (angle > 45 && angle < 135) {
        // Swipe down
        onSwipeDown?.();
      } else if (angle < -45 && angle > -135) {
        // Swipe up
        onSwipeUp?.();
      }
    }
    // Handle tap gestures
    else if (distance < 10 && duration < 300 && !gestureState.current.isLongPress) {
      const now = Date.now();
      const timeSinceLastTap = now - gestureState.current.lastTapTime;
      
      if (timeSinceLastTap < 300) {
        // Double tap
        gestureState.current.tapCount++;
        if (gestureState.current.tapCount === 2 && onDoubleTap) {
          onDoubleTap();
          gestureState.current.tapCount = 0;
        }
      } else {
        // Single tap
        gestureState.current.tapCount = 1;
        setTimeout(() => {
          if (gestureState.current.tapCount === 1 && onTap) {
            onTap();
          }
          gestureState.current.tapCount = 0;
        }, 300);
      }
      
      gestureState.current.lastTapTime = now;
    }

    // Reset gesture state
    gestureState.current.startTouch = null;
    gestureState.current.lastTouch = null;
    gestureState.current.isLongPress = false;
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Prevent default touch behaviors
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    element.addEventListener('touchstart', preventDefault, { passive: false });
    element.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      clearLongPressTimer();
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchstart', preventDefault);
      element.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return {
    ref: ref as RefObject<HTMLElement>
  };
};

export default useGestures;