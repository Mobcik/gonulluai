import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Flame, Edit, Download, Award } from 'lucide-react';
import api from '../api/client';
import type { User, Event, PointTransaction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/common/Avatar';
import BadgeDisplay from '../components/common/Badge';
import EventCard from '../components/events/EventCard';
import { badgeInfo, formatPoints, nextBadgeThreshold } from '../utils/formatPoints';
import { formatRelative } from '../utils/formatDate';
import { cn } from '../utils/cn';
import { MOCK_USERS, MOCK_POINT_HISTORY, getUserEvents } from '../api/mockData';
import { rewardsApi } from '../api/rewards';

const TABS = ['Aktif Etkinlikler', 'Geçmiş Etkinlikler', 'Oluşturduklarım', 'Puan Geçmişi'];

const Profile = () => {
  const { id }    = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const isOwn     = !id || id === me?.id;

  const [profile,  setProfile]  = useState<User | null>(null);
  const [events,   setEvents]   = useState<Event[]>([]);
  const [points,   setPoints]   = useState<PointTransaction[]>([]);
  const [tab,      setTab]      = useState(0);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const userId = id || me?.id;
    if (!userId) { setLoading(false); return; }

    const fallbackUser  = MOCK_USERS.find(u => u.id === userId) || me || MOCK_USERS[0];
    const fallbackPts   = MOCK_POINT_HISTORY.filter(p => p.user_id === userId || p.user_id === 'u-demo');
    const fallbackEvts  = getUserEvents(userId);

    Promise.all([
      api.get<User>(`/users/${userId}`).then(r => setProfile(r.data)).catch(() => setProfile(fallbackUser)),
      api.get<Event[]>(`/users/${userId}/events`).then(r => setEvents(r.data)).catch(() => setEvents(fallbackEvts)),
      api.get<PointTransaction[]>(`/users/${userId}/points`).then(r => setPoints(r.data)).catch(() => setPoints(fallbackPts)),
    ]).finally(() => setLoading(false));
  }, [id, me]);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = profile || MOCK_USERS[0];
  const nextThreshold = nextBadgeThreshold[user.badge as keyof typeof nextBadgeThreshold];
  const pct = nextThreshold ? Math.round((user.earned_points / nextThreshold) * 100) : 100;

  const STATS = [
    { label: 'Katıldığı',    value: events.filter(e => !e.is_creator).length,  icon: '🤝' },
    { label: 'Oluşturduğu',  value: events.filter(e => e.is_creator).length,   icon: '✏️' },
    { label: 'Toplam Puan',  value: formatPoints(user.total_points),            icon: '⭐' },
    { label: 'Gün Streak',   value: user.streak_days,                           icon: '🔥' },
  ];

  return (
    <div className="min-h-screen pt-16 pb-16">
      {/* Hero */}
      <div className="relative h-48 bg-gradient-to-br from-primary to-earth overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Avatar + info */}
        <div className="relative -mt-16 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative">
              <Avatar src={user.avatar_url} name={user.full_name} size="xl" className="ring-4 ring-white shadow-card" />
              {user.is_student && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-chip font-bold">
                  🎓
                </div>
              )}
            </div>

            <div className="sm:pb-2 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-text">{user.full_name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <BadgeDisplay badge={user.badge} />
                    {user.city && (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <MapPin size={12} /> {user.city}
                      </span>
                    )}
                    {user.university_name && (
                      <span className="text-xs text-blue-600 font-medium">🎓 {user.university_name}</span>
                    )}
                  </div>
                </div>
                {isOwn && (
                  <Link to="/settings" className="flex items-center gap-1.5 text-sm text-text-soft hover:text-text border border-earth-lighter px-3 py-1.5 rounded-xl transition-colors mt-1">
                    <Edit size={14} />
                    Düzenle
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-5">
            {/* Bio */}
            {user.bio && (
              <div className="card">
                <p className="text-sm text-text-soft leading-relaxed">{user.bio}</p>
              </div>
            )}

            {/* Stats */}
            <div className="card">
              <div className="grid grid-cols-2 gap-3">
                {STATS.map((s, i) => (
                  <div key={i} className="text-center p-3 bg-earth-lighter rounded-xl">
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className="font-bold text-text text-lg">{s.value}</div>
                    <div className="text-xs text-text-muted">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Badge progress */}
            <div className="card">
              <h3 className="font-semibold text-text text-sm mb-3 flex items-center gap-2">
                <Award size={15} className="text-primary" />
                Rozet İlerlemesi
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{badgeInfo[user.badge as keyof typeof badgeInfo]?.emoji}</span>
                <span className="font-semibold text-sm text-text">{badgeInfo[user.badge as keyof typeof badgeInfo]?.label}</span>
              </div>
              {nextThreshold ? (
                <>
                  <div className="w-full h-2 bg-earth-lighter rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-gradient-to-r from-primary to-earth rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>{formatPoints(user.earned_points)} puan</span>
                    <span>{nextThreshold - user.earned_points} puan kaldı</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-text-muted">Maksimum rozete ulaştın! 🏆</p>
              )}
            </div>

            {/* Interests */}
            {user.interests.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-text text-sm mb-2">İlgi Alanları</h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.interests.map((interest: string) => (
                    <span key={interest} className="chip chip-inactive text-xs px-3 py-1">{interest}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Streak */}
            {user.streak_days > 0 && (
              <div className="card bg-orange-50 border border-orange-100">
                <div className="flex items-center gap-3">
                  <Flame size={22} className="text-orange-500" />
                  <div>
                    <p className="font-bold text-text">{user.streak_days} Günlük Streak!</p>
                    <p className="text-xs text-text-muted">Ardı ardına aktifsin 🔥</p>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate download (own profile) */}
            {isOwn && user.earned_points >= 500 && (
              <div className="card bg-primary-light border border-primary/20">
                <p className="text-sm font-semibold text-primary mb-2">📜 Sertifikan hazır!</p>
                <button
                  onClick={() => rewardsApi.downloadCertificate().catch(() => {})}
                  className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  İndir
                </button>
              </div>
            )}

            <div className="text-xs text-text-muted text-center">
              <Calendar size={11} className="inline mr-1" />
              {formatRelative(user.created_at)} katıldı
            </div>
          </div>

          {/* Main content — Tabs */}
          <div className="lg:col-span-2">
            {/* Tab headers */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-card mb-5 overflow-x-auto">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(i)}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap px-3',
                    tab === i ? 'bg-primary text-white shadow-green' : 'text-text-soft hover:text-text'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 0 && (
              <div className="space-y-4">
                {events.filter(e => ['active', 'ongoing', 'full'].includes(e.status)).length === 0 ? (
                  <div className="text-center py-10 text-text-muted">
                    <div className="text-4xl mb-2">📅</div>
                    <p>Aktif etkinlik yok</p>
                    <Link to="/discover" className="text-primary text-sm font-semibold hover:underline">Etkinlik bul →</Link>
                  </div>
                ) : (
                  events.filter(e => ['active', 'ongoing', 'full'].includes(e.status)).map(ev => (
                    <EventCard key={ev.id} event={ev} />
                  ))
                )}
              </div>
            )}

            {tab === 1 && (
              <div className="space-y-4">
                {events.filter(e => e.status === 'completed').length === 0 ? (
                  <div className="text-center py-10 text-text-muted">
                    <div className="text-4xl mb-2">🎉</div>
                    <p>Geçmiş etkinlik yok</p>
                  </div>
                ) : (
                  events.filter(e => e.status === 'completed').map(ev => (
                    <EventCard key={ev.id} event={ev} />
                  ))
                )}
              </div>
            )}

            {tab === 2 && (
              <div className="space-y-4">
                {events.filter(e => e.is_creator).length === 0 ? (
                  <div className="text-center py-10 text-text-muted">
                    <div className="text-4xl mb-2">✏️</div>
                    <p>Henüz etkinlik oluşturmadın</p>
                    <Link to="/events/new" className="text-primary text-sm font-semibold hover:underline">Etkinlik oluştur →</Link>
                  </div>
                ) : (
                  events.filter(e => e.is_creator).map(ev => (
                    <EventCard key={ev.id} event={ev} />
                  ))
                )}
              </div>
            )}

            {tab === 3 && (
              <div className="space-y-2">
                {points.length === 0 ? (
                  <div className="text-center py-10 text-text-muted">
                    <div className="text-4xl mb-2">⭐</div>
                    <p>Henüz puan işlemi yok</p>
                  </div>
                ) : (
                  points.map(tx => (
                    <div key={tx.id} className="card flex items-center gap-4">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                        tx.points > 0 ? 'bg-primary-light text-primary' : 'bg-red-50 text-red-500'
                      )}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text">{POINT_REASON_MAP[tx.reason] || tx.reason}</p>
                        <p className="text-xs text-text-muted">{formatRelative(tx.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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

export default Profile;
