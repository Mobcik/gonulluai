import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Search, Sparkles, CheckCircle, Star, TrendingUp,
  ChevronRight, Zap, Target, Settings, ArrowRight, Users,
} from 'lucide-react';
import { eventsApi } from '../api/events';
import { useAuth } from '../contexts/AuthContext';
import { useSkillMatch } from '../hooks/useSkillMatch';
import type { Event } from '../types';
import EventCard from '../components/events/EventCard';
import { cn } from '../utils/cn';
import { formatEventDate } from '../utils/formatDate';
import { categoryEmoji } from '../utils/formatPoints';

// ─── Yetenek Kategorileri ─────────────────────────────────────────────────────

const SKILL_GROUPS = [
  {
    label: 'İletişim & Liderlik', emoji: '🗣️', color: 'blue',
    skills: [
      { key: 'İletişim',  emoji: '🗣️' },
      { key: 'Liderlik',  emoji: '👑' },
      { key: 'Psikoloji', emoji: '🧠' },
    ],
  },
  {
    label: 'Teknoloji & Tasarım', emoji: '💻', color: 'purple',
    skills: [
      { key: 'Yazılım',      emoji: '💻' },
      { key: 'Tasarım',      emoji: '🎨' },
      { key: 'Sosyal Medya', emoji: '📱' },
    ],
  },
  {
    label: 'Eğitim & Bilim', emoji: '📚', color: 'amber',
    skills: [
      { key: 'Öğretmenlik', emoji: '📚' },
      { key: 'Tercüme',     emoji: '🌐' },
      { key: 'Muhasebe',    emoji: '📊' },
    ],
  },
  {
    label: 'Sağlık & Destek', emoji: '🏥', color: 'red',
    skills: [
      { key: 'Tıp / Sağlık', emoji: '🏥' },
      { key: 'Hukuk',        emoji: '⚖️' },
    ],
  },
  {
    label: 'Sanat & Spor', emoji: '🎵', color: 'pink',
    skills: [
      { key: 'Fotoğrafçılık',     emoji: '📸' },
      { key: 'Müzik',             emoji: '🎵' },
      { key: 'Spor Antrenörlüğü', emoji: '🏃' },
    ],
  },
  {
    label: 'Pratik Beceriler', emoji: '🚗', color: 'earth',
    skills: [
      { key: 'Araç Kullanımı', emoji: '🚗' },
    ],
  },
];

const ALL_SKILLS = SKILL_GROUPS.flatMap(g => g.skills);

/** Gemini yanıt vermezse kullanılacak basit fallback metin */
const fallbackReason = (ev: Event & { matchedSkills: string[] }, userSkills: string[]): string => {
  if (ev.matchedSkills.length >= 2)
    return `${ev.matchedSkills.slice(0, 2).join(' ve ')} yeteneklerin bu etkinlik için biçilmiş kaftan.`;
  if (ev.matchedSkills.length === 1)
    return `${ev.matchedSkills[0]} yeteneğin burada gerçekten işe yarar.`;
  if (userSkills.length > 0)
    return `${ev.category} alanındaki etkinlikler profiline uygun.`;
  return 'Bu etkinlik yeni gönüllüler için açık kapı.';
};

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

const Skills = () => {
  const { user } = useAuth();
  const [events,  setEvents]  = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.discover({ page: 1 })
      .then(r => setEvents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const {
    selected, search, matchMode, showAll, aiReasons, aiLoading,
    enriched, filtered, aiPicks, totalMatchCount,
    setSearch, setMatchMode, setShowAll, toggleSkill,
  } = useSkillMatch({ events, user });

  const userSkillSet = useMemo(() => new Set(user?.skills || []), [user]);

  return (
    <div className="min-h-screen pt-16 bg-earth-lighter/40">

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary/10 via-white to-earth-lighter border-b border-earth-lighter">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
                <Wrench size={14} /> Yetenek Pazaryeri
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-text">
                Yeteneklerinle fark yarat
              </h1>
              <p className="text-text-soft mt-2 max-w-lg">
                Hangi becerilere sahip olduğunu seç — AI, sana en uygun etkinlikleri öne çıkarsın.
              </p>
            </div>

            <div className="flex gap-3 flex-shrink-0">
              <div className="bg-white rounded-2xl p-4 shadow-card text-center min-w-[90px]">
                <p className="text-2xl font-bold text-primary">{loading ? '…' : totalMatchCount}</p>
                <p className="text-xs text-text-muted mt-0.5">Uyumlu etkinlik</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-card text-center min-w-[90px]">
                <p className="text-2xl font-bold text-earth">{selected.length}</p>
                <p className="text-xs text-text-muted mt-0.5">Seçili yetenek</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-card text-center min-w-[90px]">
                <p className="text-2xl font-bold text-amber-500">{userSkillSet.size}</p>
                <p className="text-xs text-text-muted mt-0.5">Profilim</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Profil Yetenekleri ─────────────────────────────────────────── */}
        {user && (user.skills?.length > 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text flex items-center gap-2">
                <Star size={16} className="text-amber-500" /> Profilindeki Yetenekler
              </h2>
              <Link to="/settings" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <Settings size={12} /> Güncelle
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.skills.map(s => {
                const meta       = ALL_SKILLS.find(a => a.key === s);
                const isSelected = selected.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSkill(s)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-sm font-semibold transition-all border',
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-green'
                        : 'bg-primary-light text-primary border-primary/30 hover:border-primary'
                    )}
                  >
                    {meta?.emoji || '🔧'} {s}
                    {isSelected && <CheckCircle size={12} />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-3">Profil yeteneğin otomatik seçili — filtrelemek için tıkla</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-primary-light to-earth-lighter rounded-2xl p-5 border border-primary/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/20">
                <Target size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">Yeteneklerini profiline ekle</h3>
                <p className="text-sm text-text-soft mt-1">
                  Hangi becerilere sahip olduğunu belirtirsen AI sana kişiselleştirilmiş etkinlik önerileri sunar.
                </p>
                <Link to="/settings" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary hover:underline">
                  Profili tamamla <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Giriş yapılmamış kullanıcı teşvik */}
        {!user && (
          <div className="bg-gradient-to-r from-primary to-earth rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles size={22} className="opacity-80" />
              <h3 className="font-bold text-lg">AI Eşleştirmesi için Giriş Yap</h3>
            </div>
            <p className="text-white/80 text-sm mb-4 max-w-md">
              Profilindeki yeteneklerine göre en uygun etkinlikleri otomatik bulalım.
            </p>
            <div className="flex gap-3">
              <Link to="/login" className="bg-white text-primary font-semibold px-5 py-2 rounded-chip text-sm hover:bg-primary-light transition-colors">Giriş Yap</Link>
              <Link to="/register" className="border border-white/50 text-white font-medium px-5 py-2 rounded-chip text-sm hover:bg-white/10 transition-colors">Kayıt Ol</Link>
            </div>
          </div>
        )}

        {/* ── AI Önerileri (Gemini) ────────────────────────────────────────── */}
        {!loading && aiPicks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-earth-lighter bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-text flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  AI Önerileri
                  <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-chip font-semibold">Gemini</span>
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  {aiLoading && <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />}
                  Yeteneklerine göre sıralandı
                </span>
              </div>
            </div>

            <div className="divide-y divide-earth-lighter">
              {aiPicks.map((ev, i) => {
                const reason         = aiReasons[ev.id] || fallbackReason(ev, user?.skills || []);
                const matchedInEvent = ev.required_skills?.filter(s => selected.includes(s)) || [];
                return (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="flex gap-4 p-4 hover:bg-earth-lighter/50 transition-colors group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center font-bold text-primary text-sm">{i + 1}</div>
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-earth-lighter">
                      {ev.cover_photo_url
                        ? <img src={ev.cover_photo_url} alt={ev.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">{categoryEmoji[ev.category]}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-text text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">{ev.title}</p>
                        {ev.matchScore > 0 && (
                          <span className="flex-shrink-0 flex items-center gap-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-chip font-semibold">
                            <Zap size={9} /> {Math.floor(ev.matchScore)} eşleşme
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-soft mt-1 line-clamp-2 italic">"{reason}"</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-[11px] text-text-muted">{ev.city} · {formatEventDate(ev.event_date)}</span>
                        {matchedInEvent.slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] bg-primary-light text-primary px-1.5 py-0.5 rounded-md font-semibold">
                            {ALL_SKILLS.find(a => a.key === s)?.emoji || '🔧'} {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-muted flex-shrink-0 self-center group-hover:text-primary transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Yetenek Filtresi ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" /> Yetenek Filtresi
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted hidden sm:inline">Eşleşme:</span>
              {(['any', 'all'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMatchMode(m); setShowAll(false); }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold transition-all',
                    matchMode === m ? 'bg-primary text-white' : 'bg-earth-lighter text-text-soft hover:bg-earth-light'
                  )}
                  title={m === 'any' ? 'Seçili yeteneklerden en az biri eşleşsin' : 'Seçili yeteneklerin tümü eşleşsin'}
                >
                  {m === 'any' ? 'En az biri' : 'Tümü'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Etkinlik veya kategori ara…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-10 text-sm"
            />
          </div>

          <div className="space-y-4">
            {SKILL_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-text-soft uppercase tracking-wide mb-2">
                  {group.emoji} {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.skills.map(s => {
                    const isMine   = userSkillSet.has(s.key);
                    const isChosen = selected.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        onClick={() => toggleSkill(s.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-sm font-medium border-[1.5px] transition-all',
                          isChosen
                            ? 'bg-primary text-white border-primary shadow-green'
                            : isMine
                              ? 'border-primary/40 text-primary bg-primary-light hover:bg-primary/10'
                              : 'border-earth-light text-text-soft hover:border-primary/40 hover:text-text bg-white'
                        )}
                      >
                        <span>{s.emoji}</span> {s.key}
                        {isMine && !isChosen && <span className="text-[9px] bg-primary/20 text-primary px-1 rounded font-bold">●</span>}
                        {isChosen && <CheckCircle size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selected.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-earth-lighter">
              <span className="text-sm text-text-soft">
                <strong className="text-primary">{selected.length}</strong> yetenek seçili →{' '}
                <strong className="text-text">{filtered.length}</strong> etkinlik
              </span>
              <button
                onClick={() => { enriched; setSearch(''); }}
                className="text-xs text-text-muted hover:text-text underline"
              >
                Temizle
              </button>
            </div>
          )}
        </div>

        {/* ── Etkinlik Listesi ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              {selected.length > 0
                ? <><Target size={16} className="text-primary" /> Yeteneğine Uygun Etkinlikler</>
                : <><Users size={16} className="text-primary" /> Tüm Etkinlikler</>
              }
              <span className="text-sm text-text-muted font-normal">({filtered.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-card shadow-card overflow-hidden animate-pulse">
                  <div className="h-44 bg-earth-lighter" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-earth-lighter rounded w-3/4" />
                    <div className="h-3 bg-earth-lighter rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-card">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold text-text mb-1">Uyumlu etkinlik bulunamadı</p>
              <p className="text-sm text-text-muted">Farklı yetenekler seç veya eşleşme modunu değiştir</p>
              <button
                onClick={() => setSearch('')}
                className="mt-4 text-sm text-primary font-medium hover:underline"
              >
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(showAll ? filtered : filtered.slice(0, 9)).map(ev => (
                  <div key={ev.id} className="relative">
                    {ev.matchScore > 0 && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-chip font-semibold shadow-green">
                        <Sparkles size={9} /> {Math.round(ev.matchScore * 10) / 10} eşleşme
                      </div>
                    )}
                    <EventCard event={ev} />
                  </div>
                ))}
              </div>

              {filtered.length > 9 && !showAll && (
                <div className="mt-6 text-center">
                  <button onClick={() => setShowAll(true)} className="btn-secondary px-8">
                    Tümünü Göster ({filtered.length - 9} daha)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Skills;
