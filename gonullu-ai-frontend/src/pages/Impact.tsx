import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine, BookOpen, Heart, Clock, Recycle,
  Users, Calendar, MapPin, Share2, Download,
  TrendingUp, Globe, Camera,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { badgeInfo, categoryEmoji } from '../utils/formatPoints';
import { cn } from '../utils/cn';

interface PlatformImpact {
  total_events:        number;
  completed_events:    number;
  total_participants:  number;
  total_users:         number;
  active_cities:       number;
  total_photos:        number;
  total_points:        number;
  category_breakdown:  { category: string; count: number }[];
  trees_planted:       number;
  children_educated:   number;
  animals_helped:      number;
  hours_volunteered:   number;
  kg_waste_collected:  number;
}

interface UserImpact {
  user_id:         string;
  full_name:       string;
  avatar_url:      string;
  badge:           string;
  total_points:    number;
  joined_count:    number;
  created_count:   number;
  photos_uploaded: number;
  volunteer_hours: number;
  top_category:    string | null;
  categories:      Record<string, number>;
  trees_planted:   number;
  children_helped: number;
  hours_given:     number;
}

const BigStat = ({ icon, value, label, color, sub }: {
  icon: React.ReactNode; value: string | number; label: string;
  color: string; sub?: string;
}) => (
  <div className="text-center">
    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3', color)}>
      {icon}
    </div>
    <div className="text-3xl font-display font-bold text-text">{value.toLocaleString()}</div>
    <div className="text-sm font-semibold text-text mt-0.5">{label}</div>
    {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
  </div>
);

const Impact = () => {
  const { user }                      = useAuth();
  const [platform, setPlatform]       = useState<PlatformImpact | null>(null);
  const [myImpact, setMyImpact]       = useState<UserImpact | null>(null);
  const [loading, setLoading]         = useState(true);
  const [cardVisible, setCardVisible] = useState(false);
  const cardRef                       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req: Promise<any>[] = [api.get<PlatformImpact>('/analytics/impact')];
    if (user) req.push(api.get<UserImpact>(`/analytics/impact/user/${user.id}`));

    Promise.allSettled(req).then(([pRes, uRes]) => {
      if (pRes.status === 'fulfilled') setPlatform(pRes.value.data);
      if (uRes && uRes.status === 'fulfilled') setMyImpact((uRes as any).value.data);
    }).finally(() => setLoading(false));
  }, [user]);

  const shareCard = async () => {
    const text = myImpact
      ? `GönüllüAI platformunda ${myImpact.joined_count} etkinliğe katıldım, ${myImpact.volunteer_hours} saat gönüllülük yaptım! 🌱 #GönüllüAI`
      : 'GönüllüAI platformunda gönüllülük yapıyorum! 🌱';

    if (navigator.share) {
      await navigator.share({ title: 'Etki Kartım', text, url: window.location.origin }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      alert('Metin panoya kopyalandı!');
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const badgeMeta = myImpact ? badgeInfo[myImpact.badge as keyof typeof badgeInfo] : null;

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* ── HERO ─────────────────────────────────────────── */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-earth rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-green">
            <Globe size={30} className="text-white" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text">Etki Raporu</h1>
          <p className="text-text-muted mt-2 max-w-lg mx-auto">
            Gönüllülerin birlikte yarattığı somut değişim
          </p>
        </div>

        {/* ── PLATFORM ETKİSİ ─────────────────────────────── */}
        {platform && (
          <div className="bg-gradient-to-br from-primary to-earth rounded-3xl p-8 sm:p-10 text-white">
            <h2 className="font-display text-2xl font-bold text-center mb-8 text-white/90">
              🌍 Platform Geneli
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              <BigStat icon={<Users size={26} className="text-white" />}   value={platform.total_users}       label="Gönüllü"           color="bg-white/20" />
              <BigStat icon={<Calendar size={26} className="text-white" />} value={platform.total_events}     label="Etkinlik"           color="bg-white/20" />
              <BigStat icon={<MapPin size={26} className="text-white" />}   value={platform.active_cities}    label="Şehir"              color="bg-white/20" />
              <BigStat icon={<Clock size={26} className="text-white" />}    value={platform.hours_volunteered} label="Gönüllülük Saati"  color="bg-white/20" />
            </div>
          </div>
        )}

        {/* ── SOMUT ETKİLER ───────────────────────────────── */}
        {platform && (
          <div>
            <h2 className="font-display text-2xl font-bold text-center text-text mb-6">
              Somut Değişim
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { icon: <TreePine size={28} />,  value: platform.trees_planted,      label: 'Ağaç Dikildi',          color: 'bg-green-100 text-green-700' },
                { icon: <BookOpen size={28} />,  value: platform.children_educated,  label: 'Çocuğa Eğitim',         color: 'bg-blue-100 text-blue-700' },
                { icon: <Heart size={28} />,     value: platform.animals_helped,     label: 'Hayvan Korundu',         color: 'bg-red-100 text-red-700' },
                { icon: <Clock size={28} />,     value: platform.hours_volunteered,  label: 'Saat Gönüllülük',        color: 'bg-purple-100 text-purple-700' },
                { icon: <Recycle size={28} />,   value: platform.kg_waste_collected, label: 'kg Atık Toplandı',       color: 'bg-amber-100 text-amber-700' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 text-center shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3', item.color)}>
                    {item.icon}
                  </div>
                  <div className="text-2xl font-bold text-text">{item.value.toLocaleString()}</div>
                  <div className="text-xs text-text-muted mt-1">{item.label}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-text-muted mt-3">
              * Tahmini değerler. Gerçek etki tamamlanan etkinlik sayısına göre hesaplanmaktadır.
            </p>
          </div>
        )}

        {/* ── KATEGORİ DAĞILIMI ───────────────────────────── */}
        {(platform?.category_breakdown?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold text-text mb-5 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" /> Kategori Dağılımı
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {platform?.category_breakdown
                ?.sort((a, b) => b.count - a.count)
                .map(cat => (
                  <Link
                    key={cat.category}
                    to={`/discover?category=${cat.category}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-earth-lighter transition-colors"
                  >
                    <span className="text-2xl">{categoryEmoji[cat.category] || '🌿'}</span>
                    <div>
                      <p className="text-sm font-semibold text-text">{cat.category}</p>
                      <p className="text-xs text-text-muted">{cat.count} etkinlik</p>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* ── KİŞİSEL ETKİ KARTI ──────────────────────────── */}
        {user && myImpact && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-xl text-text">Benim Etkisi</h2>
              <button
                onClick={shareCard}
                className="flex items-center gap-2 bg-white shadow-card px-4 py-2.5 rounded-xl text-sm font-semibold text-text hover:shadow-card-hover transition-all"
              >
                <Share2 size={15} className="text-primary" /> Paylaş
              </button>
            </div>

            {/* Paylaşılabilir kart */}
            <div
              ref={cardRef}
              className="relative bg-gradient-to-br from-primary via-earth to-amber-800 rounded-3xl p-8 text-white overflow-hidden"
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_20%,white,transparent)]" />
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  {myImpact.avatar_url ? (
                    <img src={myImpact.avatar_url} alt="" className="w-14 h-14 rounded-full ring-2 ring-white/40 object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                      {myImpact.full_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-xl">{myImpact.full_name}</h3>
                    <p className="text-white/80 text-sm">
                      {badgeMeta?.emoji} {badgeMeta?.label} · GönüllüAI
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mb-6">
                  {[
                    { value: myImpact.joined_count,    label: 'Etkinlik' },
                    { value: myImpact.volunteer_hours, label: 'Saat' },
                    { value: myImpact.trees_planted,   label: 'Ağaç' },
                    { value: myImpact.children_helped, label: 'Çocuk' },
                    { value: myImpact.total_points,    label: 'Puan' },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
                      <div className="text-xs text-white/70">{s.label}</div>
                    </div>
                  ))}
                </div>

                {myImpact.top_category && (
                  <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">{categoryEmoji[myImpact.top_category] || '🌿'}</span>
                    <div>
                      <p className="text-xs text-white/70">En çok katkı sağladığım alan</p>
                      <p className="font-semibold">{myImpact.top_category}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                  <p className="text-xs text-white/60">gonulluai.app</p>
                  <p className="text-xs text-white/60">{new Date().getFullYear()}</p>
                </div>
              </div>
            </div>

            {/* Kişisel detaylar */}
            <div className="grid sm:grid-cols-3 gap-4 mt-4">
              {[
                { icon: <Camera size={20} />,    value: myImpact.photos_uploaded, label: 'Fotoğraf Yükledi',     bg: 'bg-purple-50', c: 'text-purple-500' },
                { icon: <Calendar size={20} />,  value: myImpact.created_count,   label: 'Etkinlik Oluşturdu',  bg: 'bg-blue-50',   c: 'text-blue-500' },
                { icon: <TreePine size={20} />,  value: myImpact.trees_planted,   label: 'Tahmini Ağaç',        bg: 'bg-green-50',  c: 'text-green-500' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-card flex items-center gap-4">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                    <span className={s.c}>{s.icon}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-text">{s.value}</div>
                    <div className="text-xs text-text-muted">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA: Giriş yapmamış */}
        {!user && (
          <div className="bg-gradient-to-r from-primary to-earth rounded-2xl p-8 text-white text-center">
            <Globe size={36} className="mx-auto mb-3 opacity-80" />
            <h3 className="font-bold text-xl mb-2">Kendi Etki Kartını Oluştur</h3>
            <p className="text-white/80 text-sm mb-5 max-w-sm mx-auto">
              Giriş yaparak kişisel etki özetini gör ve LinkedIn'de paylaş
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/register" className="bg-white text-primary font-semibold px-5 py-2.5 rounded-chip text-sm hover:bg-primary-light transition-colors">
                Ücretsiz Katıl
              </Link>
              <Link to="/login" className="bg-white/20 text-white font-semibold px-5 py-2.5 rounded-chip text-sm hover:bg-white/30 transition-colors">
                Giriş Yap
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Impact;
