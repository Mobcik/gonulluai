import { cn } from '../../utils/cn';
import { badgeInfo } from '../../utils/formatPoints';
import type { UserBadge } from '../../types';

interface BadgeDisplayProps {
  badge: UserBadge;
  size?: 'sm' | 'md' | 'lg';
}

const BadgeDisplay = ({ badge, size = 'md' }: BadgeDisplayProps) => {
  const info = badgeInfo[badge];
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5',
  };

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-chip font-semibold', info.bg, info.color, sizes[size])}>
      <span>{info.emoji}</span>
      <span>{info.label}</span>
    </span>
  );
};

export default BadgeDisplay;
