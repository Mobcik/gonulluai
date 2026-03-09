import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, CalendarDays, ShieldCheck, Plus, Building2, ChevronRight } from 'lucide-react';
import { clubsApi } from '../api/clubs';
import { useAuth } from '../contexts/AuthContext';
import type { Club } from '../types';
import { cn } from '../utils/cn';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const ClubCard = ({ club }: { club: Club }) => {
  const [imgErr, setImgErr] = useState(false);
  const logoSrc = resolveMediaUrl(club.logo_url);

  return (
    <Link
      to={`/clubs/${club.id}`}
      className="bg-white rounded-2xl shadow-card hover:shadow-card-hover border border-earth-lighter/50 hover:border-primary/20 transition-all duration-200 hover:-translate-y-0.5 flex flex-col overflow-hidden group"
    >
      {/* Üst renkli bant */}
      <div className="h-2 bg-gradient-to-r from-primary to-primary-dark" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Logo + isim */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-earth-lighter border border-earth-lighter flex items-center justify-center">
            {logoSrc && !imgErr
              ? <img src={logoSrc} alt={club.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
              : <Building2 size={24} className="text-earth" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h3 className="font-bold text-text text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {club.name}
              </h3>
              {club.verified && (
                <ShieldCheck size={15} className="text-primary flex-shrink-0 mt-0.5" />
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <Building2 size={10} />
              {club.university}
            </p>
          </div>
        </div>

        {/* Açıklama */}
        {club.description && (
          <p className="text-sm text-text-soft line-clamp-2 leading-relaxed flex-1">
            {club.description}
          </p>
        )}

        {/* İstatistikler */}
        <div className="flex items-center gap-4 pt-3 border-t border-earth-lighter">
          <div className="flex items-center gap-1.5 text-sm text-text-soft">
            <Users size={13} className="text-primary" />
            <span className="font-semibold text-text">{club.member_count.toLocaleString('tr-TR')}</span>
            <span>üye</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-text-soft">
            <CalendarDays size={13} className="text-earth" />
            <span className="font-semibold text-text">{club.event_count}</span>
            <span>etkinlik</span>
          </div>
          <div className="ml-auto">
            <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
};

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const ClubsList = () => {
  const { user }            = useAuth();
  const [clubs,   setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    clubsApi.list()
      .then(r => setClubs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = clubs.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.university.toLowerCase().includes(q);
  });

  const verifiedClubs   = filtered.filter(c => c.verified);
  const unverifiedClubs = filtered.filter(c => !c.verified);

  return (
    <div className="min-h-screen pt-16 bg-earth-lighter/40">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-earth-lighter to-primary-light/10 border-b border-earth-lighter">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
                <Users size={14} />
                Topluluklar
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-text">
                Öğrenci Kulüpleri
              </h1>
              <p className="text-text-soft mt-1 max-w-lg">
                Üniversite gönüllülük kulüpleri — katıl, birlikte etkinlik yap, etki yarat.
              </p>
            </div>

            {/* Kulüp oluştur butonu (sadece öğrenciler) */}
            {user?.is_student && (
              <Link
                to="/clubs/new"
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-chip text-sm font-semibold shadow-green hover:bg-primary-dark hover:-translate-y-0.5 transition-all"
              >
                <Plus size={15} />
                Kulüp Oluştur
              </Link>
            )}
          </div>

          {/* İstatistik çubukları */}
          {!loading && (
            <div className="flex gap-6 mt-6">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-semibold text-text">{clubs.length}</span>
                <span className="text-text-muted">topluluk</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck size={13} className="text-primary" />
                <span className="font-semibold text-text">{clubs.filter(c => c.verified).length}</span>
                <span className="text-text-muted">doğrulanmış</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users size={13} className="text-earth" />
                <span className="font-semibold text-text">
                  {clubs.reduce((s, c) => s + c.member_count, 0).toLocaleString('tr-TR')}
                </span>
                <span className="text-text-muted">toplam üye</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── İçerik ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Arama */}
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Kulüp veya üniversite ara…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-card overflow-hidden animate-pulse">
                <div className="h-2 bg-earth-lighter" />
                <div className="p-5 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-earth-lighter rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-earth-lighter rounded w-3/4" />
                      <div className="h-3 bg-earth-lighter rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-earth-lighter rounded w-full" />
                  <div className="h-3 bg-earth-lighter rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-card">
            <Building2 size={40} className="mx-auto mb-3 text-earth opacity-40" />
            <p className="font-semibold text-text mb-1">Kulüp bulunamadı</p>
            <p className="text-sm text-text-muted">Farklı bir arama deneyin</p>
          </div>
        ) : (
          <>
            {/* Doğrulanmış kulüpler */}
            {verifiedClubs.length > 0 && (
              <section>
                <h2 className="font-semibold text-text flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} className="text-primary" />
                  Doğrulanmış Kulüpler
                  <span className="text-sm text-text-muted font-normal">({verifiedClubs.length})</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {verifiedClubs.map(club => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </section>
            )}

            {/* Diğer kulüpler */}
            {unverifiedClubs.length > 0 && (
              <section>
                <h2 className="font-semibold text-text flex items-center gap-2 mb-4">
                  <Users size={16} className="text-earth" />
                  Diğer Kulüpler
                  <span className="text-sm text-text-muted font-normal">({unverifiedClubs.length})</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {unverifiedClubs.map(club => (
                    <ClubCard key={club.id} club={club} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Kulüp oluşturma teşviki */}
        {!loading && (
          <div className={cn(
            'rounded-2xl p-6 border-2 border-dashed text-center',
            user?.is_student
              ? 'border-primary/30 bg-primary-light/30'
              : 'border-earth-lighter bg-white'
          )}>
            {user?.is_student ? (
              <>
                <Building2 size={28} className="mx-auto mb-3 text-primary opacity-60" />
                <h3 className="font-semibold text-text mb-1">Kendi kulübünü kur</h3>
                <p className="text-sm text-text-soft mb-4 max-w-sm mx-auto">
                  Üniversitende gönüllülük kulübü yok mu? Oluştur, etkinlik düzenle, üye topla!
                </p>
                <Link to="/clubs/new" className="btn-primary px-6">
                  Kulüp Oluştur
                </Link>
              </>
            ) : (
              <>
                <Building2 size={28} className="mx-auto mb-3 text-earth opacity-40" />
                <h3 className="font-semibold text-text mb-1">Kulüp kurmak ister misin?</h3>
                <p className="text-sm text-text-soft mb-4">
                  Kulüp oluşturmak için öğrenci hesabı (.edu.tr) gereklidir.
                </p>
                {!user && (
                  <Link to="/register" className="btn-primary px-6">
                    Öğrenci Olarak Kayıt Ol
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsList;
