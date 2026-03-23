import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  differenceInDays,
  intervalToDuration,
  isBefore,
} from 'date-fns';
import { tr } from 'date-fns/locale';

export const formatEventDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return `Bugün, ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `Yarın, ${format(date, 'HH:mm')}`;
  return format(date, 'd MMMM yyyy, HH:mm', { locale: tr });
};

export const formatRelative = (dateStr: string): string => {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: tr });
};

export const daysUntilEvent = (dateStr: string): number => {
  return differenceInDays(new Date(dateStr), new Date());
};

export const formatShortDate = (dateStr: string): string => {
  return format(new Date(dateStr), 'd MMM', { locale: tr });
};

/** Yaklaşan etkinlik için geri sayım parçaları (şu an → etkinlik tarihi) */
export function countdownToEvent(
  eventDateStr: string,
  now = new Date()
): { ended: true } | { ended: false; days: number; hours: number; minutes: number; seconds: number } {
  const end = new Date(eventDateStr);
  if (isBefore(end, now)) return { ended: true };
  const d = intervalToDuration({ start: now, end });
  return {
    ended: false,
    days: d.days ?? 0,
    hours: d.hours ?? 0,
    minutes: d.minutes ?? 0,
    seconds: d.seconds ?? 0,
  };
}
