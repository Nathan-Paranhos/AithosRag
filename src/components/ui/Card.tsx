import React from 'react';
import { cn } from '../../utils/cn';
// import { colors, typography } from '../../design/tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'default',
    padding = 'md',
    hover = false,
    interactive = false,
    children,
    ...props
  }, ref) => {
    const baseStyles = `
      rounded-lg transition-all duration-200 relative overflow-hidden
    `;

    const variants = {
      default: `
        bg-white border border-gray-200 shadow-sm
        dark:bg-gray-900 dark:border-gray-800
      `,
      elevated: `
        bg-white shadow-lg border border-gray-100
        dark:bg-gray-900 dark:border-gray-800 dark:shadow-2xl
      `,
      outlined: `
        bg-transparent border-2 border-gray-200
        dark:border-gray-700
      `,
      glass: `
        backdrop-blur-md bg-white/10 border border-white/20
        shadow-xl dark:bg-black/10 dark:border-white/10
      `
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    };

    const hoverStyles = hover ? `
      hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]
      dark:hover:shadow-2xl
    ` : '';

    const interactiveStyles = interactive ? `
      cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500
      focus:ring-offset-2 dark:focus:ring-offset-gray-900
    ` : '';

    return (
      <div
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hover && hoverStyles,
          interactive && interactiveStyles,
          className
        )}
        ref={ref}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, divider = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col space-y-1.5',
          divider && 'pb-4 border-b border-gray-200 dark:border-gray-700',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Title Component
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'text-lg font-semibold leading-none tracking-tight text-white dark:text-gray-100',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'CardTitle';

// Card Description Component
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          'text-sm text-gray-600 dark:text-gray-400',
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

// Card Content Component
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = 'none', children, ...props }, ref) => {
    const paddings = {
      none: '',
      sm: 'pt-3',
      md: 'pt-4',
      lg: 'pt-6'
    };

    return (
      <div
        ref={ref}
        className={cn(paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer Component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, divider = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          divider && 'pt-4 border-t border-gray-200 dark:border-gray-700',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
};