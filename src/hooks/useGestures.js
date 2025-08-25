import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for advanced gesture navigation and touch interactions
 * Supports swipe, pinch, tap, long press, and pull-to-refresh gestures
 */
export const useGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchIn,
  onPinchOut,
  onTap,
  onDoubleTap,
  onLongPress,
  onPullToRefresh,
  swipeThreshold = 50,
  pinchThreshold = 0.1,
  longPressDelay = 500,
  doubleTapDelay = 300,
  pullThreshold = 100,
  enabled = true
} = {}) => {
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [gestureType, setGestureType] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [scale, setScale] = useState(1);
  
  const longPressTimer = useRef(null);
  const doubleTapTimer = useRef(null);
  const lastTap = useRef(0);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const elementRef = useRef(null);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1, touch2) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Calculate swipe direction and distance
  const getSwipeData = useCallback((startTouch, endTouch) => {
    const deltaX = endTouch.clientX - startTouch.clientX;
    const deltaY = endTouch.clientY - startTouch.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let direction = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    return { direction, distance, deltaX, deltaY };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    setTouchStart({
      clientX: touch.clientX,
      clientY: touch.clientY,
      timeStamp: e.timeStamp
    });
    
    setIsGestureActive(true);
    
    // Handle multi-touch for pinch gestures
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      initialDistance.current = distance;
      initialScale.current = scale;
      setGestureType('pinch');
    } else {
      // Setup long press detection
      longPressTimer.current = setTimeout(() => {
        if (onLongPress) {
          onLongPress({
            clientX: touch.clientX,
            clientY: touch.clientY
          });
          setGestureType('longpress');
        }
      }, longPressDelay);
    }
  }, [enabled, onLongPress, longPressDelay, getDistance, scale]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (!enabled || !touchStart) return;
    
    const touch = e.touches[0];
    
    // Clear long press timer on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Handle pinch gesture
    if (e.touches.length === 2 && gestureType === 'pinch') {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / initialDistance.current;
      const newScale = initialScale.current * scaleChange;
      
      setScale(newScale);
      
      const scaleDiff = newScale - initialScale.current;
      if (Math.abs(scaleDiff) > pinchThreshold) {
        if (scaleDiff > 0 && onPinchOut) {
          onPinchOut({ scale: newScale, scaleDiff });
        } else if (scaleDiff < 0 && onPinchIn) {
          onPinchIn({ scale: newScale, scaleDiff });
        }
      }
      return;
    }
    
    // Handle pull-to-refresh
    if (onPullToRefresh && touchStart.clientY < 100 && window.scrollY === 0) {
      const deltaY = touch.clientY - touchStart.clientY;
      if (deltaY > 0) {
        setIsPulling(true);
        setPullDistance(Math.min(deltaY, pullThreshold * 1.5));
        
        // Prevent default scrolling during pull
        e.preventDefault();
      }
    }
    
    setTouchEnd({
      clientX: touch.clientX,
      clientY: touch.clientY,
      timeStamp: e.timeStamp
    });
  }, [enabled, touchStart, gestureType, onPinchIn, onPinchOut, onPullToRefresh, 
      getDistance, pinchThreshold, pullThreshold]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (!enabled) return;
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    setIsGestureActive(false);
    
    // Handle pull-to-refresh completion
    if (isPulling) {
      if (pullDistance >= pullThreshold && onPullToRefresh) {
        onPullToRefresh();
      }
      setIsPulling(false);
      setPullDistance(0);
    }
    
    // Handle swipe gestures
    if (touchStart && touchEnd && gestureType !== 'pinch' && gestureType !== 'longpress') {
      const swipeData = getSwipeData(touchStart, touchEnd);
      
      if (swipeData.distance > swipeThreshold) {
        setGestureType('swipe');
        
        switch (swipeData.direction) {
          case 'left':
            onSwipeLeft?.(swipeData);
            break;
          case 'right':
            onSwipeRight?.(swipeData);
            break;
          case 'up':
            onSwipeUp?.(swipeData);
            break;
          case 'down':
            onSwipeDown?.(swipeData);
            break;
        }
      } else {
        // Handle tap gestures
        const now = Date.now();
        const timeSinceLastTap = now - lastTap.current;
        
        if (timeSinceLastTap < doubleTapDelay && timeSinceLastTap > 0) {
          // Double tap
          if (doubleTapTimer.current) {
            clearTimeout(doubleTapTimer.current);
            doubleTapTimer.current = null;
          }
          
          if (onDoubleTap) {
            onDoubleTap({
              clientX: touchEnd.clientX,
              clientY: touchEnd.clientY
            });
            setGestureType('doubletap');
          }
        } else {
          // Single tap (with delay to detect double tap)
          doubleTapTimer.current = setTimeout(() => {
            if (onTap) {
              onTap({
                clientX: touchEnd.clientX,
                clientY: touchEnd.clientY
              });
              setGestureType('tap');
            }
          }, doubleTapDelay);
        }
        
        lastTap.current = now;
      }
    }
    
    // Reset gesture type after a delay
    setTimeout(() => setGestureType(null), 100);
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [enabled, touchStart, touchEnd, gestureType, isPulling, pullDistance, 
      pullThreshold, onPullToRefresh, getSwipeData, swipeThreshold, 
      onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, 
      doubleTapDelay]);

  // Prevent context menu on long press
  const handleContextMenu = useCallback((e) => {
    if (gestureType === 'longpress') {
      e.preventDefault();
    }
  }, [gestureType]);

  // Bind event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;
    
    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('contextmenu', handleContextMenu, { passive: false });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleContextMenu]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current);
      }
    };
  }, []);

  return {
    // Ref to attach to element
    ref: elementRef,
    
    // State
    isGestureActive,
    gestureType,
    isPulling,
    pullDistance,
    scale,
    
    // Utilities
    resetScale: () => setScale(1),
    setScale,
    
    // Pull-to-refresh progress (0-1)
    pullProgress: Math.min(pullDistance / pullThreshold, 1)
  };
};

/**
 * Hook for keyboard navigation support
 */
export const useKeyboardNavigation = ({
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onEscape,
  onSpace,
  enabled = true
} = {}) => {
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onArrowUp?.(e);
        break;
      case 'ArrowDown':
        e.preventDefault();
        onArrowDown?.(e);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onArrowLeft?.(e);
        break;
      case 'ArrowRight':
        e.preventDefault();
        onArrowRight?.(e);
        break;
      case 'Enter':
        onEnter?.(e);
        break;
      case 'Escape':
        onEscape?.(e);
        break;
      case ' ':
        e.preventDefault();
        onSpace?.(e);
        break;
    }
  }, [enabled, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, 
      onEnter, onEscape, onSpace]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return { handleKeyDown };
};

export default useGestures;