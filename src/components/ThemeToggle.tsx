import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useThemeContext';
import { cn } from '../utils/cn';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'switch';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  size = 'md',
  variant = 'button'
}) => {
  const { theme, toggleTheme } = useTheme();

  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Sun className={cn(iconSizes[size], theme === 'light' ? 'text-yellow-500' : 'text-gray-400')} />
        <button
          onClick={toggleTheme}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
          )}
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label="Toggle theme"
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        <Moon className={cn(iconSizes[size], theme === 'dark' ? 'text-blue-400' : 'text-gray-400')} />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-gray-200',
        'bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2',
        'focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200',
        'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        sizes[size],
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <Moon className={cn(iconSizes[size], 'transition-transform duration-200 hover:scale-110')} />
      ) : (
        <Sun className={cn(iconSizes[size], 'transition-transform duration-200 hover:scale-110')} />
      )}
    </button>
  );
};

export default ThemeToggle;