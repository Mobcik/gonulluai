import type { UserBadge } from '../types';

export const formatPoints = (points: number): string => {
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
  return points.toString();
};

export const badgeInfo: Record<UserBadge, { label: string; emoji: string; color: string; bg: string }> = {
  filiz:      { label: 'Filiz',             emoji: '🌱', color: 'text-green-700',  bg: 'bg-green-50' },
  genc:       { label: 'Genç Gönüllü',      emoji: '🌿', color: 'text-primary',    bg: 'bg-primary-light' },
  aktif:      { label: 'Aktif Gönüllü',     emoji: '🍃', color: 'text-primary-dark', bg: 'bg-primary-light' },
  deneyimli:  { label: 'Deneyimli Gönüllü', emoji: '🌳', color: 'text-earth',      bg: 'bg-earth-lighter' },
  lider:      { label: 'Gönüllü Lideri',    emoji: '⭐', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  efsane:     { label: 'Efsane Gönüllü',    emoji: '🏆', color: 'text-amber-700',  bg: 'bg-amber-50' },
};

export const nextBadgeThreshold: Record<UserBadge, number | null> = {
  filiz:     100,
  genc:      300,
  aktif:     700,
  deneyimli: 1500,
  lider:     3000,
  efsane:    null,
};

export const categoryEmoji: Record<string, string> = {
  'Çevre':          '🌿',
  'Eğitim':         '📚',
  'Sağlık':         '❤️',
  'Hayvan Hakları': '🐾',
  'Yaşlı Bakımı':   '👴',
  'Çocuk Gelişimi': '🧒',
  'Teknoloji':      '💻',
  'Sanat & Kültür': '🎨',
};
