import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Search, MapPin, Users, Sparkles, CheckCircle, Star } from 'lucide-react';
import { eventsApi } from '../api/events';
import { useAuth } from '../contexts/AuthContext';
import type { Event } from '../types';
import EventCard from '../components/events/EventCard';
import { categoryEmoji } from '../utils/formatPoints';
import { cn } from '../utils/cn';

const ALL_SKILLS = [
  { key: 'İletişim',         emoji: '🗣️' },
  { key: 'Liderlik',         emoji: '👑' },
  { key: 'Yazılım',          emoji: '💻' },
  { key: 'Tasarım',          emoji: '🎨' },
  { key: 'Muhasebe',         emoji: '📊' },
  { key: 'Hukuk',            emoji: '⚖️' },
  { key: 'Tıp / Sağlık',     emoji: '🏥' },
  { key: 'Öğretmenlik',      emoji: '📚' },
  { key: 'Sosyal Medya',     emoji: '📱' },
  { key: 'Fotoğrafçılık',    emoji: '📸' },
  { key: 'Tercüme',          emoji: '🌐' },
  { key: 'Müzik',            emoji: '🎵' },
  { key: 'Spor Antrenörlüğü',emoji: '🏃' },
  { key: 'Psikoloji',        emoji: '🧠' },
  { key: 'Araç Kullanımı',   emoji: '🚗' },
];

const Skills = () => {
  const { user }                  = useAuth();
  const [events, setEvents]       = useState<Event[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<string[]>([]);
  const [search, setSearch]       = useState('');
  const [matchMode, setMatchMode] = useState<'any' | 'all'>('any');

  useEffect(() => {
    eventsApi.discover({ page: 1 })
      .then(r => setEvents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Kendi yeteneklerini otomatik seç
    if (user?.skills?.length) {
      setSelected(user.skills.slice(0, 3));
    }
  }, [user]);

  const toggleSkill = (s: string) => {
    setSelected(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  // Etkinlikleri yetenek uyumuna göre filtrele + sırala
  const filtered = events
    .filter(ev => {
      const skillsNeeded: string[] = ev.required_skills || [];
      if (!skillsNeeded.length && selected.length) return true; // skill belirtmemişse herkese açık
      if (!selected.length) return true;
      if (search && !ev.title.toLowerCase().includes(search.toLowerCase())) return false;
      const matches = selected.filter(s => skillsNeeded.includes(s));
      return matchMode === 'any' ? matches.length > 0 : matches.length === selected.length;
    })
    .map(ev => {
      const needed  = ev.required_skills || [];
      const matched = selected.filter(s => needed.includes(s));
      return { ...ev, matchScore: matched.length, matchedSkills: matched };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const userSkillSet = new Set(user?.skills || []);

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench size={26} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-text">Yetenek Pazaryeri</h1>
          <p className="text-text-muted mt-2">
            Yeteneklerinle uyumlu etkinlikleri bul. AI, sana en uygun fırsatları öne çıkarır.
          </p>
        </div>

        {/* Profil yetenek özeti */}
        {user && user.skills?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text flex items-center gap-2">
                <Star size={16} className="text-primary" /> Profilindeki Yeteneklerin
              </h2>
              <Link to="/settings" className="text-xs text-primary hover:underline">Güncelle →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.skills.map(s => {
                const meta = ALL_SKILLS.find(a => a.key === s);
                return (
                  <span key={s} className="flex items-center gap-1.5 bg-primary-light text-primary px-3 py-1.5 rounded-chip text-sm font-semibold">
                    {meta?.emoji || '🔧'} {s}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="bg-white rounded-2xl p-5 shadow-card space-y-4">
          {/* Arama */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Etkinlik ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-10"
            />
          </div>

          {/* Yetenek seçici */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-text-soft uppercase tracking-wide">
                Hangi yeteneklerinle yardım etmek istiyorsun?
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted">Eşleşme:</span>
                {(['any', 'all'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMatchMode(m)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-semibold transition-all',
                      matchMode === m ? 'bg-primary text-white' : 'bg-earth-lighter text-text-soft'
                    )}
                  >
                    {m === 'any' ? 'Herhangi biri' : 'Tümü'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map(s => {
                const isMine   = userSkillSet.has(s.key);
                const isChosen = selected.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleSkill(s.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-sm font-medium border transition-all',
                      isChosen
                        ? 'bg-primary text-white border-primary shadow-green'
                        : isMine
                          ? 'border-primary/40 text-primary bg-primary-light'
                          : 'border-earth-lighter text-text-soft hover:border-primary/50'
                    )}
                  >
                    <span>{s.emoji}</span>
                    {s.key}
                    {isMine && !isChosen && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">profilim</span>
                    )}
                    {isChosen && <CheckCircle size={12} />}
                  </button>
                );
              })}
            </div>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="text-xs text-text-muted hover:text-text mt-2 underline"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* Sonuçlar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              {selected.length > 0 ? 'Yeteneğine Uygun Etkinlikler' : 'Tüm Etkinlikler'}
              <span className="text-sm text-text-muted font-normal">({filtered.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-card">
              <Wrench size={40} className="mx-auto mb-3 opacity-20 text-earth" />
              <p className="text-text-muted">Seçilen yeteneklerle eşleşen etkinlik bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(filtered as any[]).map(ev => (
                <div key={ev.id} className="relative">
                  {/* Eşleşme rozeti */}
                  {ev.matchScore > 0 && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-primary text-white text-xs px-2.5 py-1 rounded-chip font-semibold shadow-green">
                      <Sparkles size={11} />
                      {ev.matchScore} yetenek eşleşti
                    </div>
                  )}
                  {/* Aranan yetenekler */}
                  {ev.required_skills?.length > 0 && (
                    <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1">
                      {ev.required_skills.slice(0, 3).map((s: string) => {
                        const isMine = userSkillSet.has(s);
                        return (
                          <span
                            key={s}
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-chip font-semibold',
                              isMine ? 'bg-primary text-white' : 'bg-white/90 text-text'
                            )}
                          >
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <EventCard event={ev} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI eşleştirme banner */}
        {!user && (
          <div className="bg-gradient-to-r from-primary to-earth rounded-2xl p-6 text-white text-center">
            <Sparkles size={28} className="mx-auto mb-2 opacity-80" />
            <h3 className="font-bold text-lg mb-1">AI Eşleştirmesi için Giriş Yap</h3>
            <p className="text-white/80 text-sm mb-4">
              Profiliндeki yeteneklerine göre en uygun etkinlikleri otomatik bulalım
            </p>
            <Link to="/login" className="bg-white text-primary font-semibold px-5 py-2 rounded-chip text-sm hover:bg-primary-light transition-colors">
              Giriş Yap
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Skills;
