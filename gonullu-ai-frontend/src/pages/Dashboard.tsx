import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, Calendar, MapPin, Trophy, Flame, Star,
  ArrowRight, Plus, Bell, TrendingUp, Users, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventsApi } from '../api/events';
import api from '../api/client';
import type { Event, PointTransaction } from '../types';
import Avatar from '../components/common/Avatar';
import BadgeDisplay from '../components/common/Badge';
import EventCard from '../components/events/EventCard';
import { badgeInfo, formatPoints, nextBadgeThreshold, categoryEmoji } from '../utils/formatPoints';
import { formatRelative, daysUntilEvent } from '../utils/formatDate';
import { cn } from '../utils/cn';

const POINT_REASON_LABELS: Record<string, string> = {
  profile_complete:    '✅ Profil tamamlama',
  event_join:          '🤝 Etkinliğe katıldın',
  event_create:        '✏️ Etkinlik oluşturdun',
  attendance_verified: '📍 Varlık doğrulandı',
  photo_upload:        '📸 Fotoğraf yükledin',
  comment:             '💬 Yorum yaptın',
  event_complete:      '🏁 Etkinlik tamamlandı',
  late_cancel:         '❌ Geç iptal',
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate   = useNavigate();

  const [upcomingEvents, setUpcomingEvents]   = useState<Event[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [recentPoints, setRecentPoints]       = useState<PointTransaction[]>([]);
  const [stats, setStats]                     = useState({ joined: 0, created: 0 });
  const [loading, setLoading]                 = useState(true);
  const [aiWelcome, setAiWelcome]             = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    setLoading(false);

    // Paralel yükleme
    try {
      const [eventsRes, suggestRes, pointsRes] = await Promise.allSettled([
        api.get<Event[]>(`/users/${user.id}/events`),
        eventsApi.discover({ city: user.city || undefined }),
        api.get<PointTransaction[]>(`/users/${user.id}/points`),
      ]);

      if (eventsRes.status === 'fulfilled') {
        const all = eventsRes.value.data;
        const upcoming = all.filter(e =>
          e.is_joined && ['active', 'full', 'ongoing'].includes(e.status)
        );
        setUpcomingEvents(upcoming.slice(0, 3));
        setStats({
          joined:  all.filter(e => e.is_joined && !e.is_creator).length,
          created: all.filter(e => e.is_creator).length,
        });
      }

      if (suggestRes.status === 'fulfilled') {
        const notJoined = suggestRes.value.data.filter(e => !e.is_joined).slice(0, 4);
        setSuggestedEvents(notJoined);
      }

      if (pointsRes.status === 'fulfilled') {
        setRecentPoints((pointsRes.value.data as any[]).slice(0, 5));
      }

      // AI karşılama mesajını arka planda yükle (opsiyonel)
      api.get<{ message: string }>('/events/ai-welcome')
        .then(r => { if (r.data?.message) setAiWelcome(r.data.message); })
        .catch(() => {});
    } catch {
      // fail silently
    }
  };

  if (!user) return null;

  const nextThreshold = nextBadgeThreshold[user.badge as keyof typeof nextBadgeThreshold];
  const badgePct      = nextThreshold ? Math.min(Math.round((user.earned_points / nextThreshold) * 100), 100) : 100;
  const badgeMeta     = badgeInfo[user.badge as keyof typeof badgeInfo];
  const hour          = new Date().getHours();
  const greeting      = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── HERO: Kişisel selamlama ─────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-primary to-earth rounded-2xl p-6 sm:p-8 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,white,transparent)]" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar src={user.avatar_url} name={user.full_name} size="lg" className="ring-4 ring-white/30" />
            <div className="flex-1">
              <p className="text-white/70 text-sm font-medium">{greeting},</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
                {user.full_name.split(' ')[0]} 👋
              </h1>
              {aiWelcome && (
                <p className="flex items-center gap-1.5 text-white/90 text-sm mt-2 max-w-sm">
                  <Sparkles size={13} className="flex-shrink-0 opacity-80" />
                  {aiWelcome}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="flex items-center gap-1.5 bg-white/20 rounded-chip px-3 py-1 text-sm font-semibold">
                  <Star size={14} /> {formatPoints(user.total_points)} puan
                </span>
                <span className="flex items-center gap-1.5 bg-white/20 rounded-chip px-3 py-1 text-sm font-semibold">
                  {badgeMeta?.emoji} {badgeMeta?.label}
                </span>
                {user.streak_days > 0 && (
                  <span className="flex items-center gap-1.5 bg-orange-400/30 rounded-chip px-3 py-1 text-sm font-semibold">
                    <Flame size={14} /> {user.streak_days} gün streak
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Link
                to="/events/new"
                className="flex items-center gap-2 bg-white text-primary font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-primary-light transition-colors shadow-sm"
              >
                <Plus size={16} /> Etkinlik Oluştur
              </Link>
              <Link
                to="/discover"
                className="flex items-center gap-2 bg-white/20 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-white/30 transition-colors"
              >
                <Sparkles size={16} /> Etkinlik Keşfet
              </Link>
            </div>
          </div>
        </div>

        {/* ── İSTATİSTİKLER ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <TrendingUp size={20} className="text-primary" />, value: formatPoints(user.total_points), label: 'Toplam Puan', bg: 'bg-primary-light' },
            { icon: <Users size={20} className="text-blue-500" />,     value: stats.joined,                   label: 'Katıldığı',    bg: 'bg-blue-50' },
            { icon: <Calendar size={20} className="text-purple-500" />, value: stats.created,                 label: 'Oluşturduğu',  bg: 'bg-purple-50' },
            { icon: <Flame size={20} className="text-orange-500" />,   value: user.streak_days,               label: 'Günlük Streak', bg: 'bg-orange-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-card">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                {s.icon}
              </div>
              <div className="text-2xl font-bold text-text">{s.value}</div>
              <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── SOL KOLON ─────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Rozet ilerlemesi */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-primary" /> Rozet İlerlemesi
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{badgeMeta?.emoji}</span>
                <div>
                  <p className="font-bold text-text">{badgeMeta?.label}</p>
                  <p className="text-xs text-text-muted">{formatPoints(user.earned_points)} puan kazandın</p>
                </div>
              </div>
              <div className="w-full h-2.5 bg-earth-lighter rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-earth rounded-full transition-all duration-1000"
                  style={{ width: `${badgePct}%` }}
                />
              </div>
              {nextThreshold ? (
                <div className="flex justify-between text-xs text-text-muted mt-2">
                  <span>{badgePct}% tamamlandı</span>
                  <span>{nextThreshold - user.earned_points} puan kaldı</span>
                </div>
              ) : (
                <p className="text-xs text-primary font-semibold mt-2 text-center">🏆 Maksimum rozete ulaştın!</p>
              )}

              {/* Tüm rozetler */}
              <div className="mt-4 pt-4 border-t border-earth-lighter">
                <div className="flex justify-between">
                  {(['filiz', 'genc', 'aktif', 'deneyimli', 'lider', 'efsane'] as const).map(b => {
                    const info   = badgeInfo[b];
                    const thresh = nextBadgeThreshold[b];
                    const earned = !thresh || user.earned_points >= (thresh - (
                      b === 'filiz' ? 0 : 1
                    ));
                    return (
                      <div key={b} className="text-center" title={info?.label}>
                        <span className={cn('text-lg block', !earned && 'grayscale opacity-40')}>
                          {info?.emoji}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Son puan işlemleri */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text text-sm flex items-center gap-2">
                  <Star size={16} className="text-primary" /> Son Puanlar
                </h3>
                <Link to="/profile" className="text-xs text-primary hover:underline">Tümü →</Link>
              </div>
              {recentPoints.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">Henüz puan yok</p>
              ) : (
                <div className="space-y-2.5">
                  {recentPoints.map((tx: any) => (
                    <div key={tx.id} className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        tx.points > 0 ? 'bg-primary-light text-primary' : 'bg-red-50 text-red-500'
                      )}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text truncate">
                          {POINT_REASON_LABELS[tx.reason] || tx.label || tx.reason}
                        </p>
                        <p className="text-xs text-text-muted">{formatRelative(tx.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* İlgi alanları */}
            {user.interests && user.interests.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-card">
                <h3 className="font-semibold text-text text-sm mb-3">İlgi Alanlarım</h3>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map(i => (
                    <Link
                      key={i}
                      to={`/discover?category=${i}`}
                      className="flex items-center gap-1.5 text-xs bg-earth-lighter hover:bg-primary-light hover:text-primary px-3 py-1.5 rounded-chip transition-colors font-medium"
                    >
                      {categoryEmoji[i] || '🌿'} {i}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── SAĞ KOLON ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Katıldığım yaklaşan etkinlikler */}
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text flex items-center gap-2">
                  <Calendar size={16} className="text-primary" /> Yaklaşan Etkinliklerim
                </h3>
                <Link to="/profile" className="text-xs text-primary hover:underline">Tümü →</Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-sm text-text-muted mb-3">Henüz katıldığın etkinlik yok</p>
                  <Link to="/discover" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
                    <Sparkles size={14} /> Etkinlik Bul
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(ev => {
                    const days = daysUntilEvent(ev.event_date);
                    return (
                      <Link
                        key={ev.id}
                        to={`/events/${ev.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-earth-lighter transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-earth-lighter flex-shrink-0">
                          {ev.cover_photo_url ? (
                            <img src={ev.cover_photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              {categoryEmoji[ev.category] || '🌿'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-text group-hover:text-primary truncate transition-colors">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                            <span className="flex items-center gap-1"><MapPin size={10} /> {ev.city}</span>
                            <span className={cn(
                              'font-semibold',
                              days === 0 ? 'text-red-500' : days <= 3 ? 'text-amber-500' : 'text-primary'
                            )}>
                              {days === 0 ? '🔴 Bugün!' : `${days} gün kaldı`}
                            </span>
                          </div>
                        </div>
                        <CheckCircle size={16} className="text-primary flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sana özel öneriler */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" /> Sana Özel Öneriler
                  {user.city && <span className="text-xs text-text-muted font-normal">· {user.city}</span>}
                </h3>
                <Link to="/discover" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Tümünü gör <ArrowRight size={12} />
                </Link>
              </div>
              {suggestedEvents.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-text-muted shadow-card">
                  <Sparkles size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Yükleniyor...</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {suggestedEvents.map(ev => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ALT: Hızlı linkler ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/profile',     icon: '👤', label: 'Profilim' },
            { to: '/leaderboard', icon: '🏆', label: 'Sıralama' },
            { to: '/rewards',     icon: '🎁', label: 'Ödüllerim' },
            { to: '/events/new',  icon: '➕', label: 'Etkinlik Oluştur' },
          ].map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="bg-white rounded-xl p-4 text-center shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              <div className="text-2xl mb-1.5">{l.icon}</div>
              <p className="text-xs font-semibold text-text">{l.label}</p>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
