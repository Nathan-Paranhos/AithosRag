import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 700,
  className = '',
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;
        
        let x = 0;
        let y = 0;
        
        // Calculate position based on side
        switch (side) {
          case 'top':
            x = rect.left + scrollX + (rect.width / 2);
            y = rect.top + scrollY - 8;
            break;
          case 'bottom':
            x = rect.left + scrollX + (rect.width / 2);
            y = rect.bottom + scrollY + 8;
            break;
          case 'left':
            x = rect.left + scrollX - 8;
            y = rect.top + scrollY + (rect.height / 2);
            break;
          case 'right':
            x = rect.right + scrollX + 8;
            y = rect.top + scrollY + (rect.height / 2);
            break;
        }
        
        setPosition({ x, y });
        setIsVisible(true);
      }
    }, delayDuration);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipClasses = () => {
    const baseClasses = 'absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-lg pointer-events-none transition-opacity duration-200';
    
    let transformClasses = '';
    switch (side) {
      case 'top':
        transformClasses = 'transform -translate-x-1/2 -translate-y-full';
        break;
      case 'bottom':
        transformClasses = 'transform -translate-x-1/2';
        break;
      case 'left':
        transformClasses = 'transform -translate-x-full -translate-y-1/2';
        break;
      case 'right':
        transformClasses = 'transform -translate-y-1/2';
        break;
    }
    
    return cn(baseClasses, transformClasses, className);
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-gray-900 transform rotate-45';
    
    let positionClasses = '';
    switch (side) {
      case 'top':
        positionClasses = 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2';
        break;
      case 'bottom':
        positionClasses = 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2';
        break;
      case 'left':
        positionClasses = 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2';
        break;
      case 'right':
        positionClasses = 'right-full top-1/2 translate-x-1/2 -translate-y-1/2';
        break;
    }
    
    return cn(baseClasses, positionClasses);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div
          className={getTooltipClasses()}
          style={{
            left: position.x,
            top: position.y,
            opacity: isVisible ? 1 : 0
          }}
        >
          {content}
          <div className={getArrowClasses()} />
        </div>,
        document.body
      )}
    </>
  );
};

// Compound components for more flexible usage
export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const TooltipTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean }> = ({ children }) => {
  return <>{children}</>;
};

export const TooltipContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

export default {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
};