import { cn } from '../../utils/cn';

interface AvatarProps {
  src?:     string;
  name:     string;
  size?:    'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const COLORS = [
  'bg-primary text-white',
  'bg-earth text-white',
  'bg-amber-500 text-white',
  'bg-blue-500 text-white',
  'bg-purple-500 text-white',
];

const getColor = (name: string) =>
  COLORS[name.charCodeAt(0) % COLORS.length];

const Avatar = ({ src, name, size = 'md', className }: AvatarProps) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizes[size], className)}
      />
    );
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold flex-shrink-0', sizes[size], getColor(name), className)}>
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
