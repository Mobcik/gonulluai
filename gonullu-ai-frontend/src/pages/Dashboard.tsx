import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Sparkles, Calendar, MapPin, Trophy, Flame, Star,
  ArrowRight, Plus, TrendingUp, Users, CheckCircle, RefreshCw,
  Compass, Settings2, GraduationCap, Bell, Target, UsersRound, Timer,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventsApi } from '../api/events';
import { clubsApi } from '../api/clubs';
import api from '../api/client';
import type { Club, Event, PointTransaction } from '../types';
import Avatar from '../components/common/Avatar';
import BadgeDisplay from '../components/common/Badge';
import EventCard from '../components/events/EventCard';
import { badgeInfo, formatPoints, nextBadgeThreshold, categoryEmoji } from '../utils/formatPoints';
import { formatRelative, daysUntilEvent, formatEventDate, countdownToEvent } from '../utils/formatDate';
import {
  getIsoWeekKey,
  joinedEventThisWeek,
  profileGoalMet,
  hasClaimedWeeklyReward,
  markWeeklyRewardClaimed,
} from '../utils/weeklyGoals';
import { cn } from '../utils/cn';
import ApiErrorState from '../components/common/ApiErrorState';
import Button from '../components/common/Button';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import type { User } from '../types';

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

/** Giriş yapan kullanıcıya göre panel tonu ve mesajları */
function dashboardPersona(user: User, stats: { joined: number; created: number }) {
  let regDays = 999;
  if (user.created_at) {
    regDays = Math.max(0, Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000));
  }
  const newcomer =
    regDays < 21 && stats.joined === 0 && user.earned_points < 120;
  const organizer = stats.created >= 1;
  const champion = stats.joined >= 5 || user.earned_points >= 500 || user.streak_days >= 14;
  return { newcomer, organizer, champion, regDays };
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate   = useNavigate();

  const [upcomingEvents, setUpcomingEvents]   = useState<Event[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [recentPoints, setRecentPoints]       = useState<PointTransaction[]>([]);
  const [stats, setStats]                     = useState({ joined: 0, created: 0 });
  const [loading, setLoading]                 = useState(true);
  const [aiWelcome, setAiWelcome]             = useState('');
  const [dataError, setDataError]             = useState(false);
  const [dataPartial, setDataPartial]         = useState(false);
  const [unreadNotif, setUnreadNotif]         = useState(0);
  const [myClubs, setMyClubs]                 = useState<Club[]>([]);
  const [allPoints, setAllPoints]             = useState<PointTransaction[]>([]);
  const [countdownTick, setCountdownTick]     = useState(0);
  const [weekRewardNonce, setWeekRewardNonce] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setDataError(false);
    setDataPartial(false);

    const [eventsRes, suggestRes, pointsRes, notifRes, clubsRes] = await Promise.allSettled([
      api.get<Event[]>(`/users/${user.id}/events`),
      eventsApi.discover({ city: user.city || undefined }),
      api.get<PointTransaction[]>(`/users/${user.id}/points`),
      api.get<{ count: number }>('/notifications/unread-count'),
      clubsApi.myMemberships(),
    ]);

    const okCount = [eventsRes, suggestRes, pointsRes].filter(r => r.status === 'fulfilled').length;
    if (okCount === 0) setDataError(true);
    else if (okCount < 3) setDataPartial(true);

    if (notifRes.status === 'fulfilled') {
      setUnreadNotif(notifRes.value.data.count ?? 0);
    } else {
      setUnreadNotif(0);
    }

    if (clubsRes.status === 'fulfilled') {
      setMyClubs(clubsRes.value.data);
    } else {
      setMyClubs([]);
    }

    if (eventsRes.status === 'fulfilled') {
      const all = eventsRes.value.data;
      const upcoming = all
        .filter(e => e.is_joined && ['active', 'full', 'ongoing'].includes(e.status))
        .sort(
          (a, b) =>
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        );
      setUpcomingEvents(upcoming.slice(0, 3));
      setStats({
        joined:  all.filter(e => e.is_joined && !e.is_creator).length,
        created: all.filter(e => e.is_creator).length,
      });
    } else {
      setUpcomingEvents([]);
      setStats({ joined: 0, created: 0 });
    }

    if (suggestRes.status === 'fulfilled') {
      const notJoined = suggestRes.value.data.filter(e => !e.is_joined).slice(0, 4);
      setSuggestedEvents(notJoined);
    } else {
      setSuggestedEvents([]);
    }

    if (pointsRes.status === 'fulfilled') {
      const txs = pointsRes.value.data as PointTransaction[];
      setAllPoints(txs);
      setRecentPoints(txs.slice(0, 5));
    } else {
      setAllPoints([]);
      setRecentPoints([]);
    }

    api.get<{ message: string }>('/events/ai-welcome')
      .then(r => { if (r.data?.message) setAiWelcome(r.data.message); })
      .catch(() => {});

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user, authLoading, navigate, loadData]);

  const nextUpcoming = upcomingEvents[0];
  useEffect(() => {
    if (!nextUpcoming) return;
    const t = setInterval(() => setCountdownTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [nextUpcoming?.id]);

  const cdLive = useMemo(() => {
    if (!nextUpcoming) return null;
    const r = countdownToEvent(nextUpcoming.event_date);
    return r.ended ? null : r;
  }, [nextUpcoming?.event_date, countdownTick]);

  const weekKey = useMemo(() => getIsoWeekKey(), []);
  const joinWeekDone = useMemo(
    () => joinedEventThisWeek(allPoints),
    [allPoints]
  );
  const profileWeekDone = useMemo(
    () => (user ? profileGoalMet(user) : false),
    [user]
  );
  const weeklyAllDone = joinWeekDone && profileWeekDone;
  const weeklyClaimed = useMemo(
    () => Boolean(user && hasClaimedWeeklyReward(user.id, weekKey)),
    [user, weekKey, weekRewardNonce]
  );

  const claimWeeklyReward = () => {
    if (!user || !weeklyAllDone || weeklyClaimed) return;
    markWeeklyRewardClaimed(user.id, weekKey);
    setWeekRewardNonce(n => n + 1);
    toast.success('Haftalık hedef tamamlandı! +15 bonus puan yakında API ile eklenecek.', {
      duration: 4500,
    });
  };

  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const firstName  = user?.full_name?.trim().split(/\s+/)[0] ?? '';

  const persona = useMemo(() => {
    if (!user) {
      return { newcomer: true, organizer: false, champion: false, regDays: 999 };
    }
    return dashboardPersona(user, stats);
  }, [user, stats]);

  const heroGradient = persona.newcomer
    ? 'from-teal-800 via-primary to-emerald-950'
    : persona.champion
      ? 'from-[#142e1f] via-primary to-earth'
      : 'from-primary to-earth';

  const taglineFallback = useMemo(() => {
    if (!user) return '';
    if (persona.newcomer) {
      return `${firstName}, profilini tamamla ve ilk etkinliğine katıl — varlık doğrulamasıyla +35 puana kadar kazanabilirsin.`;
    }
    if (persona.organizer && stats.created > 0) {
      return `${stats.created} etkinlik oluşturdun. Katılımcıları doğrulamayı ve etkinlik sonrası tamamlamayı unutma.`;
    }
    if (upcomingEvents.length > 0) {
      return `Yakında ${upcomingEvents.length} etkinliğin var. Detaylar için aşağıya bak veya takvimden takip et.`;
    }
    if (user.city) {
      return `${user.city} ve çevresinde sana uygun etkinlikleri önerilerde bulabilirsin.`;
    }
    return 'Keşfet sekmesinden yeni etkinliklere göz at, topluluğa katıl.';
  }, [user, persona, firstName, stats.created, upcomingEvents.length]);

  const discoverInterestHref =
    user?.interests?.[0] != null
      ? `/discover?category=${encodeURIComponent(user.interests[0])}`
      : '/discover';

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-earth-lighter/40">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const nextThreshold = nextBadgeThreshold[user.badge as keyof typeof nextBadgeThreshold];
  const badgePct      = nextThreshold ? Math.min(Math.round((user.earned_points / nextThreshold) * 100), 100) : 100;
  const badgeMeta     = badgeInfo[user.badge as keyof typeof badgeInfo];

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {dataError && (
          <ApiErrorState
            title="Panel verileri yüklenemedi"
            message="Etkinlikler veya puan bilgisi alınamadı. Backend ve VITE_API_URL ayarını kontrol edip yeniden dene."
            onRetry={loadData}
          />
        )}

        {dataPartial && !dataError && (
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200/80 px-4 py-3 text-sm text-amber-950"
            role="status"
            aria-live="polite"
          >
            <span>Bazı bölümler tam yüklenmedi (ağ veya sunucu).</span>
            <Button type="button" variant="outline" size="sm" onClick={loadData} className="border-amber-300 text-amber-950 shrink-0">
              <RefreshCw size={14} aria-hidden />
              Yenile
            </Button>
          </div>
        )}

        {/* ── HERO: kullanıcıya özel selam + görsel ton ───────────────── */}
        <div
          className={cn(
            'relative bg-gradient-to-br rounded-2xl p-6 sm:p-8 text-white overflow-hidden transition-[background-image] duration-500',
            heroGradient
          )}
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,white,transparent)]" />
          {persona.newcomer && (
            <span className="absolute top-4 right-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
              Yeni gönüllü
            </span>
          )}
          {persona.champion && !persona.newcomer && (
            <span className="absolute top-4 right-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-400/90 text-earth px-2.5 py-1 rounded-full">
              Aktif gönüllü
            </span>
          )}
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar src={user.avatar_url} name={user.full_name} size="lg" className="ring-4 ring-white/30" />
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-sm font-medium">{greeting},</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
                {firstName} 👋
              </h1>
              {user.is_student && user.university_name && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-white/85 bg-white/15 rounded-lg px-2.5 py-1">
                  <GraduationCap size={14} className="opacity-90" aria-hidden />
                  {user.university_name}
                </p>
              )}
              <p className="flex items-start gap-2 text-white/90 text-sm mt-3 max-w-2xl leading-relaxed">
                <Sparkles size={14} className="flex-shrink-0 mt-0.5 opacity-85" aria-hidden />
                <span>{aiWelcome || taglineFallback}</span>
              </p>
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
                {user.city && (
                  <span className="flex items-center gap-1.5 bg-white/15 rounded-chip px-3 py-1 text-sm">
                    <MapPin size={14} /> {user.city}
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

        {/* ── Yeni kullanıcı: ilk adımlar ─────────────────────────── */}
        {persona.newcomer && (
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-light/40 to-white p-5 sm:p-6 shadow-card">
            <h2 className="font-display font-bold text-text text-lg mb-1 flex items-center gap-2">
              <Compass size={20} className="text-primary" aria-hidden />
              Senin için ilk adımlar
            </h2>
            <p className="text-sm text-text-muted mb-4">
              Her hesap farklı; buradan hızlıca ilerleyebilirsin.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Link
                to="/settings"
                className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-earth-lighter hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <Settings2 size={22} className="text-primary" aria-hidden />
                <span className="font-semibold text-sm text-text group-hover:text-primary">Profili tamamla</span>
                <span className="text-xs text-text-muted">İlgi alanı ekle, şehirini güncelle — öneriler iyileşir.</span>
              </Link>
              <Link
                to="/discover"
                className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-earth-lighter hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <Sparkles size={22} className="text-primary" aria-hidden />
                <span className="font-semibold text-sm text-text group-hover:text-primary">Etkinlik seç</span>
                <span className="text-xs text-text-muted">Katıl butonuna bas; etkinlik günü kod ile doğrula.</span>
              </Link>
              <Link
                to={discoverInterestHref}
                className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-earth-lighter hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <TrendingUp size={22} className="text-primary" aria-hidden />
                <span className="font-semibold text-sm text-text group-hover:text-primary">
                  {user.interests?.[0] ? `${user.interests[0]} keşfet` : 'Sana uygun kategoriler'}
                </span>
                <span className="text-xs text-text-muted">
                  Ayarlardan ilgi alanlarını eklediysen doğrudan o temaya gideriz.
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* ── Deneyimli düzenleyici: kısa hatırlatma ─────────────── */}
        {persona.organizer && !persona.newcomer && (
          <div className="rounded-xl border border-earth-light bg-white/90 px-4 py-3 text-sm text-text flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="flex items-center gap-2">
              <Calendar size={16} className="text-primary flex-shrink-0" aria-hidden />
              Oluşturduğun etkinlikler için katılımcı doğrulama ve tamamlama puanlarını unutma.
            </span>
            <Link to="/calendar" className="text-primary font-semibold text-xs hover:underline shrink-0">
              Takvime git →
            </Link>
          </div>
        )}

        {/* ── Bildirimler, haftalık hedef, geri sayım, topluluklar ── */}
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              to="/notifications"
              className="rounded-2xl border border-earth-lighter bg-white p-5 shadow-card hover:border-primary/35 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                    <Bell size={22} className="text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-text text-sm">Bildirimler</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {unreadNotif > 0
                        ? `${unreadNotif} okunmamış`
                        : 'Hepsi güncel'}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-text-muted group-hover:text-primary shrink-0 transition-colors"
                  aria-hidden
                />
              </div>
            </Link>

            <div className="rounded-2xl border border-earth-lighter bg-white p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Target size={18} className="text-primary" aria-hidden />
                <h2 className="font-semibold text-text text-sm">Bu haftanın hedefleri</h2>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-text">
                  <CheckCircle
                    size={16}
                    className={joinWeekDone ? 'text-primary shrink-0' : 'text-earth-light shrink-0'}
                    aria-hidden
                  />
                  <span className={joinWeekDone ? '' : 'text-text-muted'}>
                    Bir etkinliğe katıl
                  </span>
                </li>
                <li className="flex items-center gap-2 text-text">
                  <CheckCircle
                    size={16}
                    className={profileWeekDone ? 'text-primary shrink-0' : 'text-earth-light shrink-0'}
                    aria-hidden
                  />
                  <span className={profileWeekDone ? '' : 'text-text-muted'}>
                    Profilde şehir + ilgi alanı
                  </span>
                </li>
              </ul>
              {weeklyAllDone && (
                <div className="mt-3 pt-3 border-t border-earth-lighter">
                  {weeklyClaimed ? (
                    <p className="text-xs text-primary font-medium">Ödül bu hafta için alındı ✓</p>
                  ) : (
                    <Button type="button" variant="primary" size="sm" className="w-full sm:w-auto" onClick={claimWeeklyReward}>
                      Ödülü al
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {nextUpcoming && cdLive && (
            <Link
              to={`/events/${nextUpcoming.id}`}
              className="block rounded-2xl bg-gradient-to-r from-primary to-earth text-white p-5 sm:p-6 shadow-green hover:opacity-[0.98] transition-opacity"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Timer size={24} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Sıradaki etkinlik</p>
                    <p className="font-display font-bold text-lg sm:text-xl truncate">{nextUpcoming.title}</p>
                    <p className="text-sm text-white/85 mt-0.5">{formatEventDate(nextUpcoming.event_date)}</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 text-center sm:text-right shrink-0">
                  <div className="rounded-xl bg-white/15 px-4 py-2 min-w-[4rem]">
                    <div className="text-2xl font-bold tabular-nums">{cdLive.days}</div>
                    <div className="text-[10px] uppercase text-white/75">gün</div>
                  </div>
                  <div className="rounded-xl bg-white/15 px-4 py-2 min-w-[4rem]">
                    <div className="text-2xl font-bold tabular-nums">{cdLive.hours}</div>
                    <div className="text-[10px] uppercase text-white/75">saat</div>
                  </div>
                  <div className="rounded-xl bg-white/15 px-4 py-2 min-w-[4rem]">
                    <div className="text-2xl font-bold tabular-nums">
                      {String(cdLive.minutes).padStart(2, '0')}:{String(cdLive.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] uppercase text-white/75">dk/sn</div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div className="rounded-2xl border border-earth-lighter bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-text text-sm flex items-center gap-2">
                <UsersRound size={18} className="text-primary" aria-hidden />
                Topluluklarım
              </h2>
              <Link to="/clubs" className="text-xs text-primary font-semibold hover:underline shrink-0">
                Tümü →
              </Link>
            </div>
            {myClubs.length === 0 ? (
              <p className="text-sm text-text-muted">
                Henüz bir kulübe katılmadın.{' '}
                <Link to="/clubs" className="text-primary font-medium hover:underline">
                  Topluluklara göz at
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {myClubs.map(c => (
                  <Link
                    key={c.id}
                    to={`/clubs/${c.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-chip bg-earth-lighter text-xs font-medium text-text hover:bg-primary-light transition-colors"
                  >
                    {c.verified && <span aria-hidden>✓</span>}
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
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
                            <img
                              src={resolveMediaUrl(ev.cover_photo_url)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
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
                  <p className="text-sm">Şu an önerilecek yeni etkinlik yok veya liste alınamadı.</p>
                  <Link to="/discover" className="inline-block mt-3 text-xs text-primary font-semibold hover:underline">
                    Keşfet sayfasına git →
                  </Link>
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

        {/* ── ALT: Hızlı linkler (girişe göre genişletilmiş) ─────── */}
        <div>
          <h2 className="text-sm font-semibold text-text-muted mb-3">Hızlı erişim</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { to: '/profile',     icon: '👤', label: 'Profilim' },
              { to: '/calendar',    icon: '📆', label: 'Takvim' },
              { to: '/journal',     icon: '📖', label: 'Günlük' },
              { to: '/skills',      icon: '🔧', label: 'Yetenekler' },
              { to: '/leaderboard', icon: '🏆', label: 'Sıralama' },
              { to: '/rewards',     icon: '🎁', label: 'Ödüller' },
              { to: '/events/new',  icon: '➕', label: 'Etkinlik Aç' },
              { to: '/impact',      icon: '🌍', label: 'Etki Raporu' },
              { to: '/notifications', icon: '🔔', label: 'Bildirimler' },
            ].map(l => (
              <Link
                key={l.to + l.label}
                to={l.to}
                className="bg-white rounded-xl p-3 sm:p-4 text-center shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
              >
                <div className="text-xl sm:text-2xl mb-1">{l.icon}</div>
                <p className="text-[11px] sm:text-xs font-semibold text-text leading-tight">{l.label}</p>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
