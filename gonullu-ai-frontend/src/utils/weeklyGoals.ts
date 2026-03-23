import { getISOWeek, getISOWeekYear, startOfWeek } from 'date-fns';

/** ISO hafta anahtarı (örn. 2025-W12) */
export function getIsoWeekKey(d = new Date()): string {
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
}

export const weeklyRewardStorageKey = (userId: string, weekKey: string) =>
  `gonullu_weekly_reward_${userId}_${weekKey}`;

export function hasClaimedWeeklyReward(userId: string, weekKey: string): boolean {
  try {
    return localStorage.getItem(weeklyRewardStorageKey(userId, weekKey)) === '1';
  } catch {
    return false;
  }
}

export function markWeeklyRewardClaimed(userId: string, weekKey: string) {
  try {
    localStorage.setItem(weeklyRewardStorageKey(userId, weekKey), '1');
  } catch {
    /* ignore */
  }
}

/** Puan geçmişinde bu hafta içinde etkinliğe katılım var mı */
export function joinedEventThisWeek(
  points: { reason: string; created_at?: string }[],
  now = new Date()
): boolean {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return points.some(tx => {
    if (tx.reason !== 'event_join' || !tx.created_at) return false;
    return new Date(tx.created_at) >= weekStart;
  });
}

export function profileGoalMet(user: {
  city?: string;
  interests?: string[];
}): boolean {
  return Boolean(user.city && (user.interests?.length ?? 0) >= 1);
}
