import React from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff, Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'outlined' | 'ghost';
  inputSize?: 'sm' | 'md' | 'lg';
  error?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  label?: string;
  helperText?: string;
  errorText?: string;
  loading?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    variant = 'default',
    inputSize = 'md',
    error = false,
    success = false,
    leftIcon,
    rightIcon,
    clearable = false,
    onClear,
    label,
    helperText,
    errorText,
    loading = false,
    disabled,
    value,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const isPassword = type === 'password';
    const hasValue = value !== undefined && value !== '';

    const baseStyles = `
      flex w-full rounded-md border transition-all duration-200
      file:border-0 file:bg-transparent file:text-sm file:font-medium
      placeholder:text-gray-500 focus-visible:outline-none
      disabled:cursor-not-allowed disabled:opacity-50
      dark:placeholder:text-gray-400
    `;

    const variants = {
      default: `
        border-gray-300 bg-white px-3 py-2 text-sm
        focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
        dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100
        dark:focus:border-primary-400 dark:focus:ring-primary-400/20
      `,
      filled: `
        border-transparent bg-gray-100 px-3 py-2 text-sm
        focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
        dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-700
        dark:focus:border-primary-400 dark:focus:ring-primary-400/20
      `,
      outlined: `
        border-2 border-gray-300 bg-transparent px-3 py-2 text-sm
        focus:border-primary-500 dark:border-gray-600 dark:text-gray-100
        dark:focus:border-primary-400
      `,
      ghost: `
        border-transparent bg-transparent px-3 py-2 text-sm
        hover:bg-gray-50 focus:bg-white focus:border-gray-300
        dark:hover:bg-gray-800 dark:focus:bg-gray-700 dark:text-gray-100
      `
    };

    const sizes = {
      sm: 'h-8 px-2 text-xs',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base'
    };

    const stateStyles = {
      error: `
        border-red-500 focus:border-red-500 focus:ring-red-500/20
        dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/20
      `,
      success: `
        border-green-500 focus:border-green-500 focus:ring-green-500/20
        dark:border-green-400 dark:focus:border-green-400 dark:focus:ring-green-400/20
      `
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            type={inputType}
            className={cn(
              baseStyles,
              variants[variant],
              sizes[inputSize],
              error && stateStyles.error,
              success && stateStyles.success,
              leftIcon && 'pl-10',
              (rightIcon || clearable || isPassword || loading) && 'pr-10',
              className
            )}
            ref={ref}
            disabled={disabled || loading}
            value={value}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
            )}
            
            {clearable && hasValue && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {isPassword && !loading && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
            
            {rightIcon && !clearable && !isPassword && !loading && (
              <div className="text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        
        {(helperText || errorText) && (
          <p className={cn(
            'mt-1 text-xs',
            error ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          )}>
            {error ? errorText : helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input Component
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  searchDelay?: number;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({
    onSearch,
    searchDelay = 300,
    onChange,
    ...props
  }, ref) => {
    const [searchValue, setSearchValue] = React.useState('');
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    React.useEffect(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (onSearch) {
          onSearch(searchValue);
        }
      }, searchDelay);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [searchValue, onSearch, searchDelay]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      onChange?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        leftIcon={<Search className="h-4 w-4" />}
        placeholder="Pesquisar..."
        clearable
        onClear={() => setSearchValue('')}
        onChange={handleChange}
        value={searchValue}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { Input, SearchInput };