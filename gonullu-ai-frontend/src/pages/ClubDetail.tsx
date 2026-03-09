import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users, CalendarDays, ShieldCheck, ArrowLeft, Building2,
  ExternalLink, UserPlus, CheckCircle, CalendarRange,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clubsApi } from '../api/clubs';
import { useAuth } from '../contexts/AuthContext';
import type { Club, Event } from '../types';
import EventCard from '../components/events/EventCard';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { formatEventDate } from '../utils/formatDate';
import { categoryEmoji } from '../utils/formatPoints';

const ClubDetail = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [club,    setClub]    = useState<Club | null>(null);
  const [events,  setEvents]  = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined,  setJoined]  = useState(false);
  const [imgErr,  setImgErr]  = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      clubsApi.get(id),
      clubsApi.getEvents(id),
    ])
      .then(([clubRes, eventsRes]) => {
        setClub(clubRes.data);
        setEvents(eventsRes.data);
      })
      .catch(() => navigate('/clubs'))
      .finally(() => setLoading(false));
  }, [id]);

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

  const logoSrc       = resolveMediaUrl(club?.logo_url);
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents     = events.filter(e => new Date(e.event_date) < new Date());

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-earth-lighter/40">
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-4 animate-pulse">
          <div className="h-8 bg-white rounded-xl w-1/3" />
          <div className="bg-white rounded-2xl p-8 shadow-card space-y-4">
            <div className="flex gap-6">
              <div className="w-24 h-24 bg-earth-lighter rounded-2xl" />
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-earth-lighter rounded w-1/2" />
                <div className="h-4 bg-earth-lighter rounded w-1/3" />
                <div className="h-4 bg-earth-lighter rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Geri butonu */}
        <button
          onClick={() => navigate('/clubs')}
          className="flex items-center gap-2 text-sm text-text-soft hover:text-text transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Tüm Topluluklar
        </button>

        {/* ── Kulüp Başlık Kartı ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Üst renk bandı */}
          <div className="h-3 bg-gradient-to-r from-primary to-primary-dark" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Logo */}
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-earth-lighter border border-earth-lighter flex items-center justify-center">
                {logoSrc && !imgErr
                  ? <img src={logoSrc} alt={club.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
                  : <Building2 size={36} className="text-earth opacity-60" />
                }
              </div>

              {/* Bilgi */}
              <div className="flex-1">
                <div className="flex items-start gap-3 flex-wrap">
                  <h1 className="font-display text-2xl font-bold text-text leading-tight">
                    {club.name}
                  </h1>
                  {club.verified && (
                    <span className="flex items-center gap-1 bg-primary-light text-primary text-xs px-2.5 py-1 rounded-chip font-semibold mt-0.5">
                      <ShieldCheck size={12} />
                      Doğrulanmış
                    </span>
                  )}
                </div>

                <p className="flex items-center gap-1.5 text-sm text-text-muted mt-1">
                  <Building2 size={13} />
                  {club.university}
                </p>

                {club.description && (
                  <p className="text-text-soft text-sm mt-3 leading-relaxed max-w-xl">
                    {club.description}
                  </p>
                )}

                {/* İstatistikler */}
                <div className="flex flex-wrap gap-5 mt-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-light rounded-xl flex items-center justify-center">
                      <Users size={15} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-text text-lg leading-none">
                        {club.member_count.toLocaleString('tr-TR')}
                      </p>
                      <p className="text-xs text-text-muted">Üye</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-earth-lighter rounded-xl flex items-center justify-center">
                      <CalendarDays size={15} className="text-earth" />
                    </div>
                    <div>
                      <p className="font-bold text-text text-lg leading-none">{club.event_count}</p>
                      <p className="text-xs text-text-muted">Etkinlik</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                      <CalendarRange size={15} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-text text-lg leading-none">{upcomingEvents.length}</p>
                      <p className="text-xs text-text-muted">Yaklaşan</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Katıl butonu */}
              <div className="flex-shrink-0 flex flex-col gap-2">
                {joined ? (
                  <div className="flex items-center gap-2 bg-primary-light text-primary px-5 py-2.5 rounded-chip text-sm font-semibold">
                    <CheckCircle size={15} />
                    Üyesin
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-chip text-sm font-semibold shadow-green hover:bg-primary-dark hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {joining ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus size={15} />
                    )}
                    Kulübe Katıl
                  </button>
                )}

                <Link
                  to="/events/new"
                  className="flex items-center gap-2 border border-earth-light text-text-soft px-5 py-2.5 rounded-chip text-sm font-medium hover:bg-earth-lighter hover:text-text transition-all text-center justify-center"
                >
                  <ExternalLink size={13} />
                  Etkinlik Oluştur
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Yaklaşan Etkinlikler ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              Yaklaşan Etkinlikler
              <span className="text-sm text-text-muted font-normal">({upcomingEvents.length})</span>
            </h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-card">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-semibold text-text mb-1">Yaklaşan etkinlik yok</p>
              <p className="text-sm text-text-muted">Bu kulübün henüz planlanmış etkinliği bulunmuyor.</p>
              <Link to="/events/new" className="inline-block mt-4 btn-primary px-6 text-sm">
                Etkinlik Oluştur
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {upcomingEvents.map(ev => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </section>

        {/* ── Tamamlanan Etkinlikler ───────────────────────────────────────── */}
        {pastEvents.length > 0 && (
          <section>
            <h2 className="font-semibold text-text flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-earth" />
              Geçmiş Etkinlikler
              <span className="text-sm text-text-muted font-normal">({pastEvents.length})</span>
            </h2>

            <div className="bg-white rounded-2xl shadow-card divide-y divide-earth-lighter overflow-hidden">
              {pastEvents.map(ev => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-earth-lighter/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-earth-lighter flex items-center justify-center flex-shrink-0 text-lg">
                    {categoryEmoji[ev.category] || '📅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {ev.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {ev.city} · {formatEventDate(ev.event_date)} · {ev.participant_count} katılımcı
                    </p>
                  </div>
                  <span className="text-xs bg-earth-lighter text-text-soft px-2 py-0.5 rounded-chip flex-shrink-0">
                    Tamamlandı
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ClubDetail;
