import React from 'react';
import { cn } from '../../utils/cn';
import { colors, spacing, borderRadius, boxShadow, animation } from '../../design/tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glassmorphism?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'default',
    size = 'default',
    loading = false,
    leftIcon,
    rightIcon,
    glassmorphism = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
      transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 
      focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
      relative overflow-hidden group
    `;

    const variants = {
      default: `
        bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800
        shadow-md hover:shadow-lg focus-visible:ring-primary-500
      `,
      destructive: `
        bg-red-600 text-white hover:bg-red-700 active:bg-red-800
        shadow-md hover:shadow-lg focus-visible:ring-red-500
      `,
      outline: `
        border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50
        hover:border-gray-400 focus-visible:ring-gray-500 dark:border-gray-600
        dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-500
      `,
      secondary: `
        bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300
        focus-visible:ring-gray-500 dark:bg-gray-800 dark:text-gray-100
        dark:hover:bg-gray-700 dark:active:bg-gray-600
      `,
      ghost: `
        text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500
        dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700
      `,
      link: `
        text-primary-600 underline-offset-4 hover:underline focus-visible:ring-primary-500
        dark:text-primary-400
      `,
      gradient: `
        bg-gradient-to-r from-primary-500 to-blue-600 text-white hover:from-primary-600
        hover:to-blue-700 shadow-lg hover:shadow-xl focus-visible:ring-primary-500
        before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20
        before:to-transparent before:opacity-0 hover:before:opacity-100
        before:transition-opacity before:duration-300
      `
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3 text-xs',
      lg: 'h-11 rounded-md px-8 text-base',
      icon: 'h-10 w-10',
      xs: 'h-8 rounded px-2 text-xs'
    };

    const glassStyles = glassmorphism ? `
      backdrop-blur-md bg-white/10 border border-white/20
      hover:bg-white/20 dark:bg-black/10 dark:border-white/10
      dark:hover:bg-black/20 shadow-xl
    ` : '';

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          glassmorphism && glassStyles,
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {leftIcon && !loading && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {children}
        {rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
        
        {/* Ripple effect */}
        <span className="absolute inset-0 overflow-hidden rounded-md">
          <span className="absolute inset-0 rounded-md bg-white/20 opacity-0 group-active:opacity-100 transition-opacity duration-150" />
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };