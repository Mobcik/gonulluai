import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users, CalendarDays, ShieldCheck, ArrowLeft, Building2,
  UserPlus, CheckCircle, CalendarRange, Clock, TrendingUp,
  Heart, Zap, Star, MapPin, Megaphone, Pencil, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clubsApi } from '../api/clubs';
import { useAuth } from '../contexts/AuthContext';
import type { Club, Event } from '../types';
import EventCard from '../components/events/EventCard';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { formatEventDate, formatShortDate } from '../utils/formatDate';
import { categoryEmoji } from '../utils/formatPoints';
import { cn } from '../utils/cn';

// Kulüp ismine göre deterministik renk üret
const getClubColor = (name: string): string => {
  const colors = [
    'from-emerald-500 to-green-700',
    'from-blue-500 to-indigo-700',
    'from-violet-500 to-purple-700',
    'from-amber-500 to-orange-700',
    'from-teal-500 to-cyan-700',
    'from-rose-500 to-pink-700',
  ];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i];
};

const getClubAccent = (name: string): string => {
  const accents = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6', '#f43f5e'];
  const i = name.charCodeAt(0) % accents.length;
  return accents[i];
};

// Kuruluş yılını hesapla
const getYearsActive = (createdAt: string): string => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} gün`;
  if (days < 365) return `${Math.floor(days / 30)} ay`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 yıl' : `${years} yıl`;
};

// Aylık ortalama etkinlik
const getMonthlyAvg = (eventCount: number, createdAt: string): string => {
  const months = Math.max(1, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const avg = eventCount / months;
  if (avg < 1) return "Ayda 1'den az";
  return `Ayda ~${Math.round(avg)}`;
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="min-h-screen pt-16 bg-earth-lighter/40 animate-pulse">
    <div className="h-56 bg-earth-lighter" />
    <div className="max-w-5xl mx-auto px-4 -mt-12 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-2xl bg-earth-lighter" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-5 bg-earth-lighter rounded w-1/2" />
            <div className="h-3 bg-earth-lighter rounded w-1/3" />
            <div className="h-3 bg-earth-lighter rounded w-2/3" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 shadow-card" />)}
      </div>
      <div className="bg-white rounded-2xl h-32 shadow-card" />
    </div>
  </div>
);

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

const ClubDetail = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [club,      setClub]      = useState<Club | null>(null);
  const [events,    setEvents]    = useState<Event[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [joining,   setJoining]   = useState(false);
  const [joined,    setJoined]    = useState(false);
  const [imgErr,    setImgErr]    = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [wallEditing, setWallEditing] = useState(false);
  const [wallText, setWallText] = useState('');
  const [wallSaving, setWallSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      clubsApi.get(id),
      clubsApi.getEvents(id),
    ])
      .then(([clubRes, eventsRes]) => {
        setClub(clubRes.data);
        const evData = eventsRes.data;
        setEvents(Array.isArray(evData) ? evData : []);
      })
      .catch(() => {
        setLoading(false);
        navigate('/clubs');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!club) return;
    setWallText(club.announcement ?? '');
    setWallEditing(false);
  }, [club?.id, club?.announcement]);

  const handleSaveWall = async () => {
    if (!id || !club) return;
    setWallSaving(true);
    try {
      const trimmed = wallText.trim();
      const { data } = await clubsApi.update(id, {
        announcement: trimmed.length ? trimmed : null,
      });
      setClub(data);
      setWallEditing(false);
      toast.success('Topluluk duvarı güncellendi');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Kaydedilemedi');
    } finally {
      setWallSaving(false);
    }
  };

  const handleJoin = async () => {
    if (!user) { navigate('/login'); return; }
    if (!id) return;
    setJoining(true);
    try {
      await clubsApi.join(id);
      setJoined(true);
      setClub(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : prev);
      toast.success('Kulübe katıldın! 🎉');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Bir hata oluştu';
      if (msg.includes('Zaten')) {
        setJoined(true);
        toast('Zaten bu kulübün üyesin.', { icon: 'ℹ️' });
      } else {
        toast.error(msg);
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <Skeleton />;
  if (!club) return null;

  const logoSrc   = resolveMediaUrl(club.logo_url);
  const gradient  = getClubColor(club.name);
  const accent    = getClubAccent(club.name);
  const now       = new Date();
  const upcoming  = events.filter(e => e.event_date && new Date(e.event_date) >= now);
  const past      = events.filter(e => e.event_date && new Date(e.event_date) < now);
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  // Etkinlik kategorilerini çıkar
  const categories = [...new Set(events.map(e => e.category).filter(Boolean))].slice(0, 4);
  const isOrganizer = user?.id === club.organizer_id;

  return (
    <div className="min-h-screen pt-16 pb-20 bg-earth-lighter/40">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div className={cn('relative h-52 sm:h-64 bg-gradient-to-br', gradient)}>
        {/* Dekoratif desen */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Geri butonu */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => navigate('/clubs')}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-chip backdrop-blur-sm transition-all"
          >
            <ArrowLeft size={14} />
            Tüm Topluluklar
          </button>
        </div>

        {/* Verified rozeti */}
        {club.verified && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-chip">
            <ShieldCheck size={13} />
            Doğrulanmış Kulüp
          </div>
        )}

        {/* İstatistik çipleri */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-chip">
            <Users size={11} />
            {club.member_count.toLocaleString('tr-TR')} üye
          </div>
          <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-chip">
            <CalendarDays size={11} />
            {club.event_count} etkinlik
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Kulüp Kimlik Kartı ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card -mt-10 relative z-10 mb-6 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Logo */}
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border-4 border-white shadow-lg"
                style={{ backgroundColor: accent + '22' }}
              >
                {logoSrc && !imgErr
                  ? <img src={logoSrc} alt={club.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
                  : <Building2 size={36} style={{ color: accent }} />
                }
              </div>

              {/* Bilgiler */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-2 mb-1">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-text leading-tight">
                    {club.name}
                  </h1>
                  {club.verified && (
                    <ShieldCheck size={20} style={{ color: accent }} className="mt-1 flex-shrink-0" />
                  )}
                </div>

                <p className="flex items-center gap-1.5 text-sm text-text-muted mb-3">
                  <Building2 size={13} />
                  {club.university}
                </p>

                {club.description && (
                  <p className="text-text-soft text-sm leading-relaxed max-w-2xl">
                    {club.description}
                  </p>
                )}

                {/* Kategori etiketleri */}
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {categories.map(cat => (
                      <span key={cat} className="flex items-center gap-1 text-xs bg-earth-lighter text-text-soft px-2.5 py-1 rounded-chip font-medium">
                        {categoryEmoji[cat]} {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Katıl / Üyesin butonu */}
              <div className="flex-shrink-0 flex flex-col gap-2 sm:items-end">
                {joined ? (
                  <div className="flex items-center gap-2 bg-primary-light text-primary px-5 py-3 rounded-xl text-sm font-semibold">
                    <CheckCircle size={16} />
                    Üyesin
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: accent, boxShadow: `0 4px 14px ${accent}55` }}
                  >
                    {joining
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <UserPlus size={16} />
                    }
                    Kulübe Katıl
                  </button>
                )}
                {!joined && (
                  <p className="text-xs text-text-muted text-center">
                    {club.member_count.toLocaleString('tr-TR')} kişi üye
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Sol: Etkinlikler ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-2xl shadow-card p-5 border-l-4 border-primary">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-text text-sm flex items-center gap-2">
                  <Megaphone size={16} className="text-primary shrink-0" />
                  Topluluk duvarı
                </h3>
                {isOrganizer && !wallEditing && (
                  <button
                    type="button"
                    onClick={() => setWallEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark"
                  >
                    <Pencil size={13} />
                    Düzenle
                  </button>
                )}
              </div>
              {wallEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={wallText}
                    onChange={e => setWallText(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Duyuru, çağrı veya kulüp haberini buraya yaz..."
                    className="input w-full text-sm resize-y min-h-[100px]"
                  />
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      disabled={wallSaving}
                      onClick={() => {
                        setWallText(club.announcement ?? '');
                        setWallEditing(false);
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-text-soft hover:bg-earth-lighter"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      disabled={wallSaving}
                      onClick={() => void handleSaveWall()}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60 flex items-center gap-2"
                    >
                      {wallSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                      Kaydet
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-soft leading-relaxed whitespace-pre-wrap">
                  {(club.announcement?.trim())
                    ? club.announcement
                    : (isOrganizer
                      ? 'Henüz duvar mesajı yok. Üyelere duyuru paylaşmak için Düzenle’ye tıkla.'
                      : 'Bu topluluğun henüz duvar mesajı yok.')}
                </p>
              )}
            </div>

            {/* Tab başlıkları */}
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="flex border-b border-earth-lighter">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors',
                    activeTab === 'upcoming'
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-text-soft hover:text-text'
                  )}
                >
                  <CalendarDays size={15} />
                  Yaklaşan
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-chip font-bold',
                    activeTab === 'upcoming' ? 'bg-primary text-white' : 'bg-earth-lighter text-text-muted'
                  )}>
                    {upcoming.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors',
                    activeTab === 'past'
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-text-soft hover:text-text'
                  )}
                >
                  <CheckCircle size={15} />
                  Geçmiş
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-chip font-bold',
                    activeTab === 'past' ? 'bg-primary text-white' : 'bg-earth-lighter text-text-muted'
                  )}>
                    {past.length}
                  </span>
                </button>
              </div>

              {/* Etkinlik içeriği */}
              <div className="p-5">
                {displayed.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-4xl mb-3">
                      {activeTab === 'upcoming' ? '📅' : '📖'}
                    </div>
                    <p className="font-semibold text-text mb-1">
                      {activeTab === 'upcoming' ? 'Yaklaşan etkinlik yok' : 'Henüz tamamlanan etkinlik yok'}
                    </p>
                    <p className="text-sm text-text-muted mb-4">
                      {activeTab === 'upcoming'
                        ? 'Bu kulüp yakın zamanda etkinlik planlamıyor.'
                        : 'Kulübün geçmiş etkinliği bulunmuyor.'}
                    </p>
                    <Link to="/events/new" className="btn-primary px-6 text-sm">
                      Etkinlik Oluştur
                    </Link>
                  </div>
                ) : activeTab === 'upcoming' ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {displayed.map(ev => (
                      <EventCard key={ev.id} event={ev} />
                    ))}
                  </div>
                ) : (
                  /* Geçmiş etkinlikler liste olarak */
                  <div className="space-y-2">
                    {displayed.map(ev => (
                      <Link
                        key={ev.id}
                        to={`/events/${ev.id}`}
                        className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-earth-lighter/70 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-earth-lighter flex items-center justify-center flex-shrink-0 text-lg">
                          {categoryEmoji[ev.category] || '📅'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {ev.title}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
                            <MapPin size={10} /> {ev.city}
                            <span>·</span>
                            <CalendarDays size={10} /> {ev.event_date ? formatShortDate(ev.event_date) : ''}
                            <span>·</span>
                            <Users size={10} /> {ev.participant_count} katılımcı
                          </p>
                        </div>
                        <span className="text-xs bg-earth-lighter text-text-muted px-2 py-0.5 rounded-chip flex-shrink-0">
                          Tamamlandı
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Sağ: Bilgi Paneli ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* İstatistikler */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h3 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={15} style={{ color: accent }} />
                Kulüp İstatistikleri
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-text-soft">
                    <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center">
                      <Users size={13} className="text-primary" />
                    </div>
                    Toplam Üye
                  </div>
                  <span className="font-bold text-text">{club.member_count.toLocaleString('tr-TR')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-text-soft">
                    <div className="w-7 h-7 rounded-lg bg-earth-lighter flex items-center justify-center">
                      <CalendarDays size={13} className="text-earth" />
                    </div>
                    Toplam Etkinlik
                  </div>
                  <span className="font-bold text-text">{club.event_count}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-text-soft">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                      <CalendarRange size={13} className="text-amber-600" />
                    </div>
                    Yaklaşan
                  </div>
                  <span className="font-bold text-text">{upcoming.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-text-soft">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Zap size={13} className="text-blue-500" />
                    </div>
                    Etkinlik sıklığı
                  </div>
                  <span className="font-bold text-text text-xs text-right">
                    {getMonthlyAvg(club.event_count, club.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-text-soft">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Clock size={13} className="text-violet-500" />
                    </div>
                    Kuruluş
                  </div>
                  <span className="font-bold text-text text-xs">
                    {getYearsActive(club.created_at)} önce
                  </span>
                </div>
              </div>
            </div>

            {/* Neden katılmalısın */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <h3 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
                <Heart size={15} style={{ color: accent }} />
                Neden Katılmalısın?
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Star,    text: 'Etkinliklere katılarak puan kazan' },
                  { icon: Users,   text: 'Motivasyonunu yüksek tutan topluluk' },
                  { icon: Zap,     text: 'Gerçek dünyada etki yaratan projeler' },
                  { icon: TrendingUp, text: 'CV\'ni güçlendir, deneyim kazan' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-text-soft">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: accent + '18' }}>
                      <Icon size={12} style={{ color: accent }} />
                    </div>
                    {text}
                  </div>
                ))}
              </div>

              {/* Katıl CTA */}
              <div className="mt-5 pt-4 border-t border-earth-lighter">
                {joined ? (
                  <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold py-2">
                    <CheckCircle size={15} />
                    Bu kulübün üyesin!
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-60"
                    style={{ backgroundColor: accent, boxShadow: `0 4px 12px ${accent}44` }}
                  >
                    {joining
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><UserPlus size={15} /> Hemen Katıl</>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Etkinlik oluştur */}
            <div className="bg-gradient-to-br from-primary-light to-earth-lighter rounded-2xl p-5 border border-primary/10">
              <CalendarDays size={20} className="text-primary mb-3" />
              <h3 className="font-semibold text-text text-sm mb-1">Etkinlik Düzenlemek İster misin?</h3>
              <p className="text-xs text-text-soft mb-4">
                Bu kulüp adına etkinlik oluştur, gönüllü topla.
              </p>
              <Link to="/events/new" className="btn-primary w-full text-sm py-2.5 text-center block">
                Etkinlik Oluştur
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubDetail;
