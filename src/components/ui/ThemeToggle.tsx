import React from 'react';
import { Moon, Sun, Monitor } from '../../utils/icons.tsx';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface ThemeToggleProps {
  variant?: 'button' | 'switch' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  size = 'md',
  showLabel = false,
  className
}) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const buttonSizes = {
    sm: 'icon',
    md: 'icon',
    lg: 'icon'
  } as const;

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={buttonSizes[size]}
        onClick={toggleTheme}
        className={cn('relative', className)}
        aria-label={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
      >
        <Sun className={cn(
          iconSizes[size],
          'rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0'
        )} />
        <Moon className={cn(
          iconSizes[size],
          'absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100'
        )} />
        {showLabel && (
          <span className="ml-2 text-sm">
            {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          </span>
        )}
      </Button>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {showLabel && (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Tema
          </span>
        )}
        <button
          onClick={toggleTheme}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            theme === 'light'
              ? 'bg-gray-200 dark:bg-gray-700'
              : 'bg-primary-600'
          )}
          aria-label={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              'flex items-center justify-center',
              theme === 'light' ? 'translate-x-1' : 'translate-x-6'
            )}
          >
            {theme === 'light' ? (
              <Sun className="h-2.5 w-2.5 text-yellow-500" />
            ) : (
              <Moon className="h-2.5 w-2.5 text-blue-500" />
            )}
          </span>
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn('relative', className)}>
        <Button
          variant="ghost"
          size={buttonSizes[size]}
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
          aria-label="Selecionar tema"
        >
          <Sun className={cn(
            iconSizes[size],
            'rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0'
          )} />
          <Moon className={cn(
            iconSizes[size],
            'absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100'
          )} />
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <button
                onClick={() => {
                  setTheme('light');
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700',
                  theme === 'light' && 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <Sun className="mr-2 h-4 w-4" />
                Modo Claro
              </button>
              
              <button
                onClick={() => {
                  setTheme('dark');
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700',
                  theme === 'dark' && 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <Moon className="mr-2 h-4 w-4" />
                Modo Escuro
              </button>
              
              <button
                onClick={() => {
                  // Sistema (auto)
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  setTheme(systemTheme);
                  setIsOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Monitor className="mr-2 h-4 w-4" />
                Sistema
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};

export { ThemeToggle };