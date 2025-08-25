// Design System Component - Professional Design Tokens & Components
// Complete design system with tokens, reusable components, dark/light mode, glassmorphism

import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Palette,
  Type,
  Layout,
  Layers,
  Zap,
  Moon,
  Sun,
  Monitor,
  Copy,
  Check,
  Download,
  Code,
  Eye,
  Settings,
  Sparkles,
  Grid,
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Bookmark,
  Bell,
  Mail,
  User,
  Search,
  Filter,
  ArrowRight,
  ChevronDown,
  Plus,
  Minus,
  X,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Design Tokens
const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },
    neutral: {
      0: '#ffffff',
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a'
    }
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      serif: ['Georgia', 'serif'],
      mono: ['JetBrains Mono', 'monospace']
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
      '7xl': '4.5rem',
      '8xl': '6rem',
      '9xl': '8rem'
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },
  spacing: {
    0: '0px',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem'
  },
  borderRadius: {
    none: '0px',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: '0 0 #0000'
  },
  animation: {
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms'
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  glassmorphism: {
    light: {
      background: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
    },
    dark: {
      background: 'rgba(0, 0, 0, 0.25)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
    }
  }
};

// Theme Context
type Theme = 'light' | 'dark' | 'system';
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      if (theme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(systemDark);
        document.documentElement.classList.toggle('dark', systemDark);
      } else {
        const dark = theme === 'dark';
        setIsDark(dark);
        document.documentElement.classList.toggle('dark', dark);
      }
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Reusable Components
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
  icon,
  loading = false
}) => {
  const { isDark } = useTheme();
  
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md hover:shadow-lg',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-md hover:shadow-lg',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 dark:hover:bg-blue-900/20',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
    glass: isDark 
      ? 'bg-black/25 backdrop-blur-md border border-white/18 text-white hover:bg-black/40 shadow-lg'
      : 'bg-white/25 backdrop-blur-md border border-white/18 text-gray-900 hover:bg-white/40 shadow-lg'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

interface CardProps {
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  className = '',
  padding = 'md'
}) => {
  const { isDark } = useTheme();
  
  const baseClasses = 'rounded-xl transition-all duration-200';
  
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    glass: isDark
      ? 'bg-black/25 backdrop-blur-md border border-white/18 shadow-lg'
      : 'bg-white/25 backdrop-blur-md border border-white/18 shadow-lg',
    elevated: 'bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl border border-gray-100 dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12'
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  label,
  icon,
  className = '',
  size = 'md'
}) => {
  const baseClasses = 'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg'
  };
  
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500';
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${icon ? 'pl-10' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = ''
}) => {
  const { isDark } = useTheme();
  
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    glass: isDark
      ? 'bg-black/25 backdrop-blur-md border border-white/18 text-white'
      : 'bg-white/25 backdrop-blur-md border border-white/18 text-gray-900'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};

// Theme Toggle Component
export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme();
  
  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };
  
  const getIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4" />;
    if (theme === 'dark') return <Moon className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      icon={getIcon()}
      className="transition-transform hover:scale-105"
    >
      {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
    </Button>
  );
};

// Main Design System Component
const DesignSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'components' | 'examples'>('tokens');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const { isDark } = useTheme();

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const ColorPalette: React.FC<{ name: string; colors: Record<string, string> }> = ({ name, colors }) => (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">{name}</h4>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {Object.entries(colors).map(([shade, color]) => (
          <div key={shade} className="group cursor-pointer" onClick={() => copyToClipboard(color, `${name}-${shade}`)}>
            <div 
              className="w-full h-12 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: color }}
            ></div>
            <div className="mt-1 text-xs text-center">
              <div className="font-medium text-gray-700 dark:text-gray-300">{shade}</div>
              <div className="text-gray-500 dark:text-gray-400 font-mono">{color}</div>
            </div>
            {copiedToken === `${name}-${shade}` && (
              <div className="text-xs text-green-600 dark:text-green-400 text-center mt-1">
                <Check className="w-3 h-3 mx-auto" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const TypographyScale: React.FC = () => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Typography Scale</h4>
      {Object.entries(designTokens.typography.fontSize).map(([size, value]) => (
        <div key={size} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-4">
            <span className="font-mono text-sm text-gray-600 dark:text-gray-400 w-12">{size}</span>
            <span 
              className="font-medium text-gray-900 dark:text-gray-100"
              style={{ fontSize: value }}
            >
              The quick brown fox jumps
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{value}</span>
            <button
              onClick={() => copyToClipboard(value, `font-${size}`)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {copiedToken === `font-${size}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const SpacingScale: React.FC = () => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Spacing Scale</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(designTokens.spacing).slice(0, 20).map(([size, value]) => (
          <div key={size} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400 w-8">{size}</span>
              <div 
                className="bg-blue-500 rounded"
                style={{ width: value, height: '1rem' }}
              ></div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{value}</span>
              <button
                onClick={() => copyToClipboard(value, `spacing-${size}`)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {copiedToken === `spacing-${size}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ComponentShowcase: React.FC = () => (
    <div className="space-y-8">
      {/* Buttons */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Buttons</h4>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="glass">Glass</Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button size="sm" variant="primary">Small</Button>
          <Button size="md" variant="primary">Medium</Button>
          <Button size="lg" variant="primary">Large</Button>
          <Button size="xl" variant="primary">Extra Large</Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" icon={<Plus className="w-4 h-4" />}>With Icon</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cards</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="default">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Default Card</h5>
            <p className="text-gray-600 dark:text-gray-400">This is a default card with standard styling.</p>
          </Card>
          <Card variant="glass">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Glass Card</h5>
            <p className="text-gray-600 dark:text-gray-400">This card uses glassmorphism effects.</p>
          </Card>
          <Card variant="elevated">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Elevated Card</h5>
            <p className="text-gray-600 dark:text-gray-400">This card has enhanced shadows.</p>
          </Card>
          <Card variant="outlined">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Outlined Card</h5>
            <p className="text-gray-600 dark:text-gray-400">This card uses border styling.</p>
          </Card>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Inputs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Default Input" placeholder="Enter text..." />
          <Input label="With Icon" placeholder="Search..." icon={<Search className="w-4 h-4" />} />
          <Input label="Error State" placeholder="Enter email..." error="This field is required" />
          <Input label="Disabled" placeholder="Disabled input" disabled />
        </div>
      </div>

      {/* Badges */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Badges</h4>
        <div className="flex flex-wrap gap-4">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="glass">Glass</Badge>
        </div>
        <div className="flex flex-wrap gap-4">
          <Badge size="sm" variant="primary">Small</Badge>
          <Badge size="md" variant="primary">Medium</Badge>
          <Badge size="lg" variant="primary">Large</Badge>
        </div>
      </div>
    </div>
  );

  const ExampleLayouts: React.FC = () => (
    <div className="space-y-8">
      {/* Dashboard Example */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dashboard Layout</h4>
        <Card variant="glass" className="p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Analytics Dashboard</h3>
                <p className="text-blue-100">Real-time metrics and insights</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="glass" className="text-white border-white/30">Live</Badge>
                <Button variant="glass" size="sm" icon={<Settings className="w-4 h-4" />}>
                  Settings
                </Button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">12.5K</div>
                <div className="text-gray-600 dark:text-gray-400">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">98.2%</div>
                <div className="text-gray-600 dark:text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">$45.2K</div>
                <div className="text-gray-600 dark:text-gray-400">Revenue</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Form Example */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Form Layout</h4>
        <Card variant="elevated">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Profile</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="First Name" placeholder="John" />
              <Input label="Last Name" placeholder="Doe" />
              <Input label="Email" type="email" placeholder="john@example.com" icon={<Mail className="w-4 h-4" />} />
              <Input label="Phone" placeholder="+1 (555) 123-4567" icon={<Bell className="w-4 h-4" />} />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="ghost">Cancel</Button>
              <Button variant="primary" icon={<Check className="w-4 h-4" />}>Save Changes</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Notification Example */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notification Styles</h4>
        <div className="space-y-3">
          <Card variant="default" className="border-l-4 border-l-blue-500">
            <div className="flex items-center space-x-3">
              <Info className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Information</div>
                <div className="text-gray-600 dark:text-gray-400">This is an informational message.</div>
              </div>
            </div>
          </Card>
          <Card variant="default" className="border-l-4 border-l-green-500">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Success</div>
                <div className="text-gray-600 dark:text-gray-400">Operation completed successfully.</div>
              </div>
            </div>
          </Card>
          <Card variant="default" className="border-l-4 border-l-yellow-500">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Warning</div>
                <div className="text-gray-600 dark:text-gray-400">Please review this action carefully.</div>
              </div>
            </div>
          </Card>
          <Card variant="default" className="border-l-4 border-l-red-500">
            <div className="flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Error</div>
                <div className="text-gray-600 dark:text-gray-400">An error occurred while processing.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Sparkles className="w-8 h-8 text-blue-600 mr-3" />
              Design System
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Professional design tokens, components, and patterns for enterprise applications
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="outline" icon={<Download className="w-4 h-4" />}>
              Export Tokens
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'tokens', label: 'Design Tokens', icon: Palette },
            { id: 'components', label: 'Components', icon: Layout },
            { id: 'examples', label: 'Examples', icon: Eye }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {activeTab === 'tokens' && (
            <div className="space-y-12">
              {/* Colors */}
              <Card variant="default">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Color Palette</h3>
                    <Badge variant="primary">Design Tokens</Badge>
                  </div>
                  {Object.entries(designTokens.colors).map(([name, colors]) => (
                    <ColorPalette key={name} name={name} colors={colors} />
                  ))}
                </div>
              </Card>

              {/* Typography */}
              <Card variant="default">
                <TypographyScale />
              </Card>

              {/* Spacing */}
              <Card variant="default">
                <SpacingScale />
              </Card>
            </div>
          )}

          {activeTab === 'components' && (
            <Card variant="default">
              <ComponentShowcase />
            </Card>
          )}

          {activeTab === 'examples' && (
            <div>
              <ExampleLayouts />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignSystem;