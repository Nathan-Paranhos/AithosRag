import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

// Context for Select state management
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled?: boolean;
}>({} as any);

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  children,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, disabled }}>
      <div ref={selectRef} className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = ''
}) => {
  const { isOpen, setIsOpen, disabled } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
        'placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400',
        className
      )}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown className={cn(
        'h-4 w-4 opacity-50 transition-transform duration-200',
        isOpen && 'rotate-180'
      )} />
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder = 'Selecione uma opção...',
  className = ''
}) => {
  const { value } = React.useContext(SelectContext);
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  // Find the selected item's label
  useEffect(() => {
    if (value) {
      // This will be set by SelectItem when it mounts
      const selectedElement = document.querySelector(`[data-select-value="${value}"]`);
      if (selectedElement) {
        setSelectedLabel(selectedElement.textContent || '');
      }
    } else {
      setSelectedLabel('');
    }
  }, [value]);

  return (
    <span className={cn('block truncate', className)}>
      {selectedLabel || placeholder}
    </span>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = ''
}) => {
  const { isOpen } = React.useContext(SelectContext);

  if (!isOpen) return null;

  return (
    <div className={cn(
      'absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg',
      'max-h-60 overflow-auto',
      'dark:bg-gray-800 dark:border-gray-600',
      className
    )}>
      {children}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  className = ''
}) => {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  const handleClick = () => {
    onValueChange?.(value);
    setIsOpen(false);
  };

  return (
    <div
      data-select-value={value}
      onClick={handleClick}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        'dark:hover:bg-gray-700 dark:focus:bg-gray-700',
        isSelected && 'bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
        className
      )}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
};

export default {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
};