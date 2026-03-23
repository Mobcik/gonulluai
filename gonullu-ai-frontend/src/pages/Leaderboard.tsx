import { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Flame } from 'lucide-react';
import { leaderboardApi } from '../api/rewards';
import type { LeaderboardEntry } from '../types';
import { badgeInfo, formatPoints } from '../utils/formatPoints';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/common/Avatar';
import Chip from '../components/common/Chip';
import ApiErrorState from '../components/common/ApiErrorState';
import { cn } from '../utils/cn';
const PERIODS     = ['Bu Hafta', 'Bu Ay', 'Tüm Zamanlar'];
const PERIOD_KEYS = ['week', 'month', 'all'] as const;
const CITIES      = ['Tüm Şehirler', 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'];

const rankIcon = (rank: number) => {
  if (rank === 1) return <Trophy size={20} className="text-yellow-500" />;
  if (rank === 2) return <Medal  size={20} className="text-gray-400" />;
  if (rank === 3) return <Medal  size={20} className="text-amber-600" />;
  return <span className="text-sm font-bold text-text-muted w-5 text-center">{rank}</span>;
};

const Leaderboard = () => {
  const { user }  = useAuth();
  const [period,  setPeriod]  = useState(0);
  const [city,    setCity]    = useState('Tüm Şehirler');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadLeaderboard = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    leaderboardApi.get({
      period: PERIOD_KEYS[period],
      city: city !== 'Tüm Şehirler' ? city : undefined,
    })
      .then(r => setEntries(r.data))
      .catch(() => {
        setEntries([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [period, city]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const top3    = entries.slice(0, 3);
  const rest    = entries.slice(3);
  const myRank  = user ? entries.findIndex(e => e.user.id === user.id) + 1 : 0;

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-b border-amber-100">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="font-display text-4xl font-bold text-text">Liderlik Tablosu</h1>
          <p className="text-text-soft mt-2">En fazla gönüllülük puanı kazananlar</p>

          {/* Period tabs */}
          <div className="flex gap-2 justify-center mt-6">
            {PERIODS.map((p, i) => (
              <Chip key={p} label={p} active={period === i} onClick={() => setPeriod(i)} />
            ))}
          </div>

          {/* City filter */}
          <div className="flex gap-2 justify-center mt-3 flex-wrap">
            {CITIES.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={cn(
                  'text-xs px-3 py-1 rounded-chip border transition-all',
                  city === c
                    ? 'bg-earth text-white border-earth'
                    : 'bg-white text-earth-light border-earth-lighter hover:border-earth-light'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-earth-lighter rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-earth-lighter rounded w-1/3" />
                  <div className="h-3 bg-earth-lighter rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ApiErrorState title="Sıralama yüklenemedi" onRetry={loadLeaderboard} className="max-w-lg mx-auto" />
        ) : entries.length === 0 ? (
          <p className="text-center text-text-muted py-16 text-sm">
            Bu dönem için henüz sıralama verisi yok. Etkinliklere katılarak puanda yer alabilirsin.
          </p>
        ) : (
          <>
            {/* TOP 3 podium */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd */}
              <div className="flex flex-col items-center gap-2 pt-8">
                <Avatar src={top3[1]?.user.avatar_url} name={top3[1]?.user.full_name || ''} size="lg" />
                <div className="text-center">
                  <Medal size={20} className="text-gray-400 mx-auto mb-1" />
                  <p className="font-semibold text-sm text-text">{top3[1]?.user?.full_name?.split(' ')[0]}</p>
                  <p className="text-xs text-text-muted font-medium">{formatPoints(top3[1]?.total_points || 0)} puan</p>
                </div>
                <div className="w-full bg-gray-200 rounded-t-xl h-16 flex items-center justify-center text-2xl font-bold text-gray-500">2</div>
              </div>

              {/* 1st */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Avatar src={top3[0]?.user.avatar_url} name={top3[0]?.user.full_name || ''} size="xl" className="ring-4 ring-yellow-400" />
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl">👑</span>
                </div>
                <div className="text-center">
                  <Trophy size={20} className="text-yellow-500 mx-auto mb-1" />
                  <p className="font-bold text-sm text-text">{top3[0]?.user?.full_name?.split(' ')[0]}</p>
                  <p className="text-xs text-primary font-bold">{formatPoints(top3[0]?.total_points || 0)} puan</p>
                </div>
                <div className="w-full bg-yellow-400 rounded-t-xl h-24 flex items-center justify-center text-3xl font-bold text-white">1</div>
              </div>

              {/* 3rd */}
              <div className="flex flex-col items-center gap-2 pt-12">
                <Avatar src={top3[2]?.user.avatar_url} name={top3[2]?.user.full_name || ''} size="lg" />
                <div className="text-center">
                  <Medal size={20} className="text-amber-600 mx-auto mb-1" />
                  <p className="font-semibold text-sm text-text">{top3[2]?.user?.full_name?.split(' ')[0]}</p>
                  <p className="text-xs text-text-muted font-medium">{formatPoints(top3[2]?.total_points || 0)} puan</p>
                </div>
                <div className="w-full bg-amber-400 rounded-t-xl h-10 flex items-center justify-center text-xl font-bold text-white">3</div>
              </div>
            </div>

            {/* Rest of list */}
            <div className="space-y-2">
              {rest.map((entry) => (
                <div
                  key={entry.user.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl transition-colors',
                    user?.id === entry.user.id ? 'bg-primary-light border-2 border-primary/30' : 'bg-white hover:bg-earth-lighter'
                  )}
                >
                  <div className="w-6 flex justify-center">{rankIcon(entry.rank)}</div>
                  <Avatar src={entry.user.avatar_url} name={entry.user.full_name} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text">{entry.user.full_name}</span>
                      <span className="text-xs">{badgeInfo[entry.user.badge].emoji}</span>
                      {entry.user.city && <span className="text-xs text-text-muted">· {entry.user.city}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted">{entry.event_count} etkinlik</span>
                      {user?.id === entry.user.id && (
                        <span className="text-xs text-primary font-semibold">Sen</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{formatPoints(entry.total_points)}</div>
                    <div className="text-xs text-text-muted">puan</div>
                  </div>
                </div>
              ))}
            </div>

            {/* My rank sticky bar */}
            {user && myRank === 0 && (
              <div className="mt-6 p-4 bg-earth-lighter rounded-xl border border-earth-light text-center">
                <Flame size={20} className="text-earth mx-auto mb-1" />
                <p className="text-sm text-text-soft">Henüz sıralamada değilsin.</p>
                <p className="text-sm text-primary font-semibold">Bir etkinliğe katıl ve puan kazan! 🚀</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* My rank fixed bottom (if ranked) */}
      {user && myRank > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-earth-lighter px-4 py-3 shadow-card-hover">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="font-bold text-primary text-lg">#{myRank}</div>
            <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
            <div className="flex-1">
              <span className="font-semibold text-sm text-text">{user.full_name}</span>
              <span className="text-xs text-text-muted ml-2">Sen</span>
            </div>
            <div className="font-bold text-primary">{formatPoints(user.total_points)} puan</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
