import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Flame, Edit, Download, Award,
  Wrench, Star, Clock, ChevronRight,
} from 'lucide-react';
import api from '../api/client';
import type { User, Event, PointTransaction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/common/Avatar';
import BadgeDisplay from '../components/common/Badge';
import EventCard from '../components/events/EventCard';
import { badgeInfo, formatPoints, nextBadgeThreshold } from '../utils/formatPoints';
import { formatRelative, formatEventDate } from '../utils/formatDate';
import { cn } from '../utils/cn';
import { rewardsApi } from '../api/rewards';

const TABS = ['Aktif Etkinlikler', 'Geçmiş Etkinlikler', 'Oluşturduklarım', 'Puan Geçmişi'];

const POINT_REASON_MAP: Record<string, string> = {
  profile_complete:    '✅ Profil tamamlama bonusu',
  event_join:          '🤝 Etkinliğe katılım',
  event_create:        '✏️ Etkinlik oluşturma',
  attendance_verified: '📍 Varlık doğrulama bonusu',
  photo_upload:        '📸 Fotoğraf yükleme',
  comment:             '💬 Yorum',
  streak_7:            '🔥 7 günlük streak bonusu',
  streak_30:           '🔥 30 günlük streak bonusu',
  invite_friend:       '👥 Arkadaş daveti',
  event_complete:      '🏁 Etkinlik tamamlama',
  late_cancel:         '❌ Geç iptal cezası',
  spam_content:        '🚫 İçerik cezası',
};

const Profile = () => {
  const { id }       = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const isOwn        = !id || id === me?.id;

  const [profile, setProfile] = useState<User | null>(null);
  const [events,  setEvents]  = useState<Event[]>([]);
  const [points,  setPoints]  = useState<PointTransaction[]>([]);
  const [tab,     setTab]     = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = id || me?.id;
    if (!userId) { setLoading(false); return; }

    setLoading(true);
    Promise.all([
      api.get<User>(`/users/${userId}`),
      api.get<Event[]>(`/users/${userId}/events`),
      api.get<PointTransaction[]>(`/users/${userId}/points`),
    ])
      .then(([uRes, eRes, pRes]) => {
        setProfile(uRes.data);
        setEvents(eRes.data);
        setPoints(pRes.data);
      })
      .catch(() => {
        setProfile(null);
        setEvents([]);
        setPoints([]);
      })
      .finally(() => setLoading(false));
  }, [id, me?.id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = profile ?? (isOwn ? me : null);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">😔</div>
        <h2 className="font-semibold text-xl text-text">Profil bulunamadı</h2>
        <p className="text-sm text-text-muted text-center max-w-md">
          Kullanıcı yüklenemedi veya sunucuya bağlanılamıyor. Backend&apos;in ayakta olduğundan emin ol.
        </p>
        <Link to="/discover" className="btn-primary">Keşfet</Link>
      </div>
    );
  }
  const nextThreshold  = nextBadgeThreshold[user.badge as keyof typeof nextBadgeThreshold];
  const pct            = nextThreshold ? Math.round((user.earned_points / nextThreshold) * 100) : 100;
  const badgeMeta      = badgeInfo[user.badge as keyof typeof badgeInfo];

  const STATS = [
    { label: 'Katıldığı',   value: events.filter(e => !e.is_creator).length, icon: '🤝', color: 'text-primary' },
    { label: 'Oluşturduğu', value: events.filter(e => e.is_creator).length,  icon: '✏️', color: 'text-earth'   },
    { label: 'Toplam Puan', value: formatPoints(user.total_points),           icon: '⭐', color: 'text-amber-600' },
    { label: 'Gün Streak',  value: user.streak_days,                          icon: '🔥', color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/30">

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative h-44 bg-gradient-to-br from-[#0F2318] via-[#1D4029] to-primary overflow-hidden">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/[0.04]" />
        <div className="absolute top-8 right-28 w-28 h-28 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-8 left-1/4 w-44 h-44 rounded-full bg-black/10" />
        <div className="absolute bottom-4 right-8 w-16 h-16 rounded-full bg-primary/30" />

        {isOwn && (
          <div className="absolute top-4 right-4">
            <Link
              to="/settings"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/90 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-all border border-white/15 shadow-sm"
            >
              <Edit size={14} /> Profili Düzenle
            </Link>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">

        {/* ── Avatar + Kimlik Kartı ─────────────────────────────────────── */}
        <div className="relative -mt-14 mb-5">
          <div className="bg-white rounded-2xl shadow-card px-6 pt-4 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">

              {/* Avatar */}
              <div className="relative flex-shrink-0 -mt-10">
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="xl"
                  className="ring-4 ring-white shadow-card"
                />
                {user.is_student && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-chip font-bold shadow">
                    🎓
                  </div>
                )}
              </div>

              {/* Bilgi */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-text leading-tight">
                      {user.full_name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <BadgeDisplay badge={user.badge} />
                      {user.city && (
                        <span className="flex items-center gap-1 text-sm font-medium text-text-soft">
                          <MapPin size={13} className="text-primary/70" /> {user.city}
                        </span>
                      )}
                      {user.university_name && (
                        <span className="text-sm font-medium text-blue-600">
                          🎓 {user.university_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock size={11} /> {formatRelative(user.created_at)} katıldı
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-sm text-text-soft mt-3 leading-relaxed max-w-xl">
                    {user.bio}
                  </p>
                )}

                {/* Yetenekler inline */}
                {(user.skills?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {user.skills!.slice(0, 5).map(s => (
                      <span key={s} className="text-xs bg-primary-light text-primary px-2.5 py-1 rounded-chip font-medium">
                        {s}
                      </span>
                    ))}
                    {user.skills!.length > 5 && (
                      <span className="text-xs text-text-muted px-2 py-1">+{user.skills!.length - 5} daha</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── İstatistik Bar ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STATS.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card px-4 py-4 flex items-center gap-3">
              <span className="text-2xl leading-none">{s.icon}</span>
              <div>
                <p className={cn('font-bold text-xl leading-tight', s.color)}>{s.value}</p>
                <p className="text-xs text-text-soft font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Rozet İlerlemesi */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h3 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <Award size={15} className="text-primary" /> Rozet İlerlemesi
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{badgeMeta?.emoji}</span>
                <div>
                  <p className="font-bold text-text">{badgeMeta?.label}</p>
                  <p className="text-xs text-text-muted">{formatPoints(user.total_points)} toplam puan</p>
                </div>
              </div>
              {nextThreshold ? (
                <>
                  <div className="w-full h-2.5 bg-earth-lighter rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-earth rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-text-muted font-medium">
                    <span className="text-primary font-semibold">{pct}%</span>
                    <span>{nextThreshold - user.earned_points} puan kaldı</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm font-semibold text-amber-600">🏆 Maksimum rozete ulaştın!</p>
                </div>
              )}
            </div>

            {/* İlgi Alanları */}
            {(user.interests?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-5">
                <h3 className="font-semibold text-text text-sm mb-3 flex items-center gap-2">
                  <Star size={14} className="text-amber-500" /> İlgi Alanları
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.interests.map((interest: string) => (
                    <span key={interest} className="text-xs bg-earth-lighter text-text-soft px-3 py-1.5 rounded-chip font-medium border border-earth-light/50">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Yetenekler (sidebar) */}
            {(user.skills?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text text-sm flex items-center gap-2">
                    <Wrench size={14} className="text-primary" /> Yetenekler
                  </h3>
                  {isOwn && (
                    <Link to="/settings" className="text-xs text-primary hover:underline">Düzenle</Link>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.skills!.map((s: string) => (
                    <span key={s} className="text-xs bg-primary-light text-primary px-3 py-1.5 rounded-chip font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Streak */}
            {user.streak_days > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-card p-5 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Flame size={22} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="font-bold text-text text-lg leading-tight">{user.streak_days} Günlük Streak</p>
                    <p className="text-xs text-text-muted">Ardı ardına aktifsin 🔥</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sertifika */}
            {isOwn && user.earned_points >= 500 && (
              <div className="bg-primary-light rounded-2xl p-5 border border-primary/20">
                <p className="text-sm font-bold text-primary mb-1">📜 Sertifikan hazır!</p>
                <p className="text-xs text-text-soft mb-3">
                  {formatPoints(user.earned_points)} puan ile sertifika almaya hak kazandın.
                </p>
                <button
                  onClick={() => rewardsApi.downloadCertificate().catch(() => {})}
                  className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Sertifikayı İndir
                </button>
              </div>
            )}

            {/* Profil Tamamlama (sadece kendi profilinde ve eksik bilgi varsa) */}
            {isOwn && (() => {
              const steps = [
                { done: !!user.bio,                   label: 'Hakkımda yaz',         href: '/settings' },
                { done: (user.skills?.length ?? 0) > 0,   label: 'Yetenek ekle',         href: '/settings' },
                { done: (user.interests?.length ?? 0) > 0, label: 'İlgi alanı seç',       href: '/settings' },
                { done: !!user.city,                  label: 'Şehir bilgisi ekle',    href: '/settings' },
                { done: events.length > 0,            label: 'İlk etkinliğe katıl',  href: '/discover' },
              ];
              const completedCount = steps.filter(s => s.done).length;
              if (completedCount === steps.length) return null;
              const pctProfile = Math.round((completedCount / steps.length) * 100);
              return (
                <div className="bg-white rounded-2xl shadow-card p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-text text-sm">Profil Gücü</h3>
                    <span className="text-xs font-bold text-primary">{pctProfile}%</span>
                  </div>
                  <div className="w-full h-2 bg-earth-lighter rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-earth rounded-full transition-all duration-700"
                      style={{ width: `${pctProfile}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {steps.map((s, i) => (
                      <Link key={i} to={s.href} className="flex items-center gap-2.5 group">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-colors',
                          s.done
                            ? 'bg-primary text-white'
                            : 'bg-earth-lighter text-text-muted group-hover:bg-primary-light group-hover:text-primary'
                        )}>
                          {s.done ? '✓' : i + 1}
                        </div>
                        <span className={cn(
                          'text-xs transition-colors',
                          s.done
                            ? 'line-through text-text-muted'
                            : 'text-text-soft font-medium group-hover:text-primary'
                        )}>
                          {s.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Hızlı Bağlantılar */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h3 className="font-semibold text-text text-sm mb-3">Hızlı Bağlantılar</h3>
              <div className="space-y-1">
                {[
                  { label: 'Etkinlik Keşfet',      href: '/discover',    emoji: '🔍' },
                  { label: 'Yetenek Eşleştir',     href: '/skills',      emoji: '🎯' },
                  { label: 'Topluluklar',           href: '/clubs',       emoji: '🏛️' },
                  { label: 'Ödüllerim',             href: '/rewards',     emoji: '🏆' },
                ].map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-earth-lighter transition-colors group"
                  >
                    <span className="text-base leading-none">{link.emoji}</span>
                    <span className="text-sm text-text-soft font-medium group-hover:text-text transition-colors">
                      {link.label}
                    </span>
                    <ChevronRight size={13} className="ml-auto text-text-muted group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Katılma tarihi */}
            <div className="flex items-center gap-2 text-xs text-text-muted justify-center py-1">
              <Calendar size={11} />
              {formatRelative(user.created_at)} tarihinde katıldı
            </div>
          </div>

          {/* ── Ana İçerik — Tab'lar ─────────────────────────────────────── */}
          <div className="lg:col-span-2">

            {/* Tab Başlıkları */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-card mb-5 overflow-x-auto">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap px-3',
                    tab === i
                      ? 'bg-primary text-white shadow-green'
                      : 'text-text-soft hover:text-text hover:bg-earth-lighter'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Aktif Etkinlikler */}
            {tab === 0 && (() => {
              const list = events.filter(e => ['active', 'ongoing', 'full'].includes(e.status));
              return list.length === 0 ? (
                <EmptyState
                  emoji="📅"
                  title="Aktif etkinlik yok"
                  subtitle="Yeni etkinlikler keşfedip katılabilirsin."
                  cta={{ label: 'Etkinlik Keşfet', href: '/discover' }}
                />
              ) : (
                <div className="space-y-4">
                  {list.map(ev => <EventCard key={ev.id} event={ev} />)}
                </div>
              );
            })()}

            {/* Geçmiş Etkinlikler */}
            {tab === 1 && (() => {
              const list = events.filter(e => e.status === 'completed');
              return list.length === 0 ? (
                <EmptyState
                  emoji="🎉"
                  title="Geçmiş etkinlik yok"
                  subtitle="Tamamlanan etkinlikler burada görünecek."
                />
              ) : (
                <div className="space-y-4">
                  {list.map(ev => <EventCard key={ev.id} event={ev} />)}
                </div>
              );
            })()}

            {/* Oluşturduklarım */}
            {tab === 2 && (() => {
              const list = events.filter(e => e.is_creator);
              return list.length === 0 ? (
                <EmptyState
                  emoji="✏️"
                  title="Henüz etkinlik oluşturmadın"
                  subtitle="Kendi etkinliğini oluştur, gönüllüleri bir araya getir."
                  cta={{ label: 'Etkinlik Oluştur', href: '/events/new' }}
                />
              ) : (
                <div className="space-y-4">
                  {list.map(ev => (
                    <div key={ev.id} className="relative">
                      <EventCard event={ev} />
                      <Link
                        to={`/events/${ev.id}/analytics`}
                        className="absolute top-3 right-3 flex items-center gap-1 text-[11px] bg-white/90 backdrop-blur-sm text-text-soft hover:text-primary px-2.5 py-1 rounded-lg shadow-sm border border-earth-lighter transition-colors"
                      >
                        İstatistikler <ChevronRight size={10} />
                      </Link>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Puan Geçmişi */}
            {tab === 3 && (
              points.length === 0 ? (
                <EmptyState
                  emoji="⭐"
                  title="Henüz puan işlemi yok"
                  subtitle="Etkinliklere katılarak puan kazanmaya başla."
                />
              ) : (
                <div className="space-y-2">
                  {points.map(tx => (
                    <div key={tx.id} className="bg-white rounded-xl shadow-card px-4 py-3 flex items-center gap-4">
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
                        tx.points > 0 ? 'bg-primary-light text-primary' : 'bg-red-50 text-red-500'
                      )}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text">
                          {POINT_REASON_MAP[tx.reason] || tx.reason}
                        </p>
                        <p className="text-xs text-text-muted">{formatRelative(tx.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Yardımcı Bileşenler ─────────────────────────────────────────────────────

const EmptyState = ({
  emoji, title, subtitle, cta,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  cta?: { label: string; href: string };
}) => (
  <div className="bg-white rounded-2xl shadow-card p-12 text-center">
    <div className="text-5xl mb-4">{emoji}</div>
    <p className="font-bold text-text text-lg mb-1">{title}</p>
    <p className="text-sm text-text-muted mb-4 max-w-xs mx-auto">{subtitle}</p>
    {cta && (
      <Link to={cta.href} className="btn-primary px-6 py-2 text-sm inline-flex items-center gap-1.5">
        {cta.label} <ChevronRight size={14} />
      </Link>
    )}
  </div>
);

// formatEventDate kullanımı için compat
const _unused = formatEventDate;
void _unused;

export default Profile;
