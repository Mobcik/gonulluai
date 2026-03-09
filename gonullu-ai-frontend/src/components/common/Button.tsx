import { cn } from '../../utils/cn';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children:   ReactNode;
  variant?:   'primary' | 'outline' | 'ghost' | 'danger';
  size?:      'sm' | 'md' | 'lg';
  loading?:   boolean;
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-chip transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-primary text-white shadow-green hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-green-lg focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
    outline: 'bg-transparent border-[1.5px] border-earth-light text-earth hover:bg-primary-light focus:ring-primary',
    ghost:   'bg-transparent text-text-soft hover:bg-primary-light focus:ring-primary',
    danger:  'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };

  const sizes = {
    sm: 'px-5 py-2 text-sm',
    md: 'px-8 py-3 text-sm',
    lg: 'px-10 py-4 text-base',
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

export default Button;
