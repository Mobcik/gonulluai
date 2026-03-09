import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, SlidersHorizontal, Sparkles, X, MapPin, Tag } from 'lucide-react';
import { eventsApi } from '../api/events';
import type { Event } from '../types';
import EventCard from '../components/events/EventCard';
import Chip from '../components/common/Chip';
import { categoryEmoji } from '../utils/formatPoints';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

const CATEGORIES = [
  'Çevre', 'Eğitim', 'Sağlık', 'Hayvan Hakları',
  'Yaşlı Bakımı', 'Çocuk Gelişimi', 'Teknoloji', 'Sanat & Kültür',
];

const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya',
  'Adana', 'Konya', 'Gaziantep', 'Samsun', 'Eskişehir',
  'Trabzon', 'Kayseri', 'Mersin', 'Diyarbakır',
];

const Discover = () => {
  const { user } = useAuth();

  // ── Sunucu tarafı filtreler (API çağrısını tetikler) ─────────────────────
  const [selectedCat,  setSelectedCat]  = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [useAI,        setUseAI]        = useState(true);

  // ── İstemci tarafı filtreler (anlık, API çağrısı gerekmez) ───────────────
  const [search,       setSearch]       = useState('');

  // ── UI durum ─────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters]   = useState(false);
  const [events,      setEvents]        = useState<Event[]>([]);
  const [loading,     setLoading]       = useState(true);
  const [welcomeMsg,  setWelcomeMsg]    = useState('');

  // ── API çağrısı: yalnızca kategori / şehir / AI modu değişince ──────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const call = useAI && user ? eventsApi.discover : eventsApi.list;
      const { data } = await call({
        category: selectedCat  || undefined,
        city:     selectedCity || undefined,
      });
      setEvents(Array.isArray(data) ? data : []);
      if (user && useAI && data?.length > 0) {
        setWelcomeMsg(`Merhaba ${user.full_name.split(' ')[0]}! Sana özel ${data.length} etkinlik sıralandı.`);
      } else {
        setWelcomeMsg('');
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [useAI, selectedCat, selectedCity, user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Anlık metin araması (client-side, API çağrısı yok) ─────────────────
  const displayed = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.short_description || '').toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q)
    );
  }, [events, search]);

  // Aktif filtre sayısı
  const activeFilterCount = [selectedCat, selectedCity].filter(Boolean).length;

  const clearAll = () => {
    setSelectedCat('');
    setSelectedCity('');
    setSearch('');
  };

  return (
    <div className="min-h-screen pt-20 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-earth-lighter to-primary-light/20 border-b border-earth-lighter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              {welcomeMsg && (
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3 bg-primary-light px-4 py-2 rounded-chip w-fit animate-fadeIn">
                  <Sparkles size={14} /> {welcomeMsg}
                </div>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold text-text">
                {useAI && user ? '✨ AI ile Keşfet' : 'Etkinlikleri Keşfet'}
              </h1>
              <p className="text-text-soft mt-1">
                {loading
                  ? 'Yükleniyor…'
                  : `${displayed.length} etkinlik${events.length !== displayed.length ? ` / ${events.length} sonuç` : ''}`
                }
                {selectedCat  && <span className="ml-2 text-primary font-medium">· {selectedCat}</span>}
                {selectedCity && <span className="ml-1 text-earth font-medium">· {selectedCity}</span>}
              </p>
            </div>

            {user && (
              <button
                onClick={() => setUseAI(v => !v)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-chip text-sm font-semibold border-2 transition-all',
                  useAI
                    ? 'bg-primary text-white border-primary shadow-green'
                    : 'bg-transparent text-earth border-earth-light hover:bg-primary-light'
                )}
              >
                <Sparkles size={15} />
                {useAI ? 'AI Sıralama Aktif' : 'AI Sıralamayı Aç'}
              </button>
            )}
          </div>

          {/* ── Arama Çubuğu ─────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Etkinlik adı, şehir veya kategori ara…"
                className="input w-full pl-11 pr-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-0.5 rounded-full hover:bg-earth-lighter transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filtreler butonu */}
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-xl border-[1.5px] text-sm font-medium transition-all',
                showFilters || activeFilterCount > 0
                  ? 'bg-primary-light border-primary text-primary'
                  : 'border-earth-light text-earth hover:bg-earth-lighter'
              )}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Filtreler</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filtreleri temizle */}
            {(activeFilterCount > 0 || search) && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-[1.5px] border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-all"
              >
                <X size={15} />
                <span className="hidden sm:inline">Temizle</span>
              </button>
            )}
          </div>

          {/* ── Kategori Chip'leri ──────────────────────────────────────────── */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scroll-smooth">
            <Chip
              label="Tümü"
              active={!selectedCat}
              onClick={() => setSelectedCat('')}
            />
            {CATEGORIES.map(cat => (
              <Chip
                key={cat}
                label={`${categoryEmoji[cat] || ''} ${cat}`}
                active={selectedCat === cat}
                onClick={() => setSelectedCat(selectedCat === cat ? '' : cat)}
              />
            ))}
          </div>

          {/* ── Genişletilmiş Filtreler ─────────────────────────────────────── */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-earth-lighter space-y-4 animate-fadeIn">
              {/* Şehir */}
              <div>
                <p className="text-xs font-semibold text-text-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MapPin size={12} /> Şehir
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Chip
                    label="Tüm Şehirler"
                    active={!selectedCity}
                    onClick={() => setSelectedCity('')}
                  />
                  {CITIES.map(city => (
                    <Chip
                      key={city}
                      label={city}
                      active={selectedCity === city}
                      onClick={() => setSelectedCity(selectedCity === city ? '' : city)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Etkinlik Grid'i ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-card shadow-card overflow-hidden animate-pulse">
                <div className="h-44 bg-earth-lighter" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-earth-lighter rounded w-3/4" />
                  <div className="h-3 bg-earth-lighter rounded w-full" />
                  <div className="h-3 bg-earth-lighter rounded w-2/3" />
                  <div className="h-2 bg-earth-lighter rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-semibold text-xl text-text mb-2">Etkinlik bulunamadı</h3>
            <p className="text-text-muted mb-6">
              {search
                ? `"${search}" için sonuç bulunamadı`
                : 'Seçili filtrelerle eşleşen etkinlik yok'
              }
            </p>
            <button onClick={clearAll} className="btn-primary px-8">
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <>
            {/* Sonuç sayısı + aktif filtre özeti */}
            {(search || activeFilterCount > 0) && (
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <p className="text-sm text-text-muted">
                  <strong className="text-text">{displayed.length}</strong> sonuç
                </p>
                {search && (
                  <span className="flex items-center gap-1 text-xs bg-earth-lighter text-text px-2.5 py-1 rounded-chip">
                    <Tag size={10} /> "{search}"
                    <button onClick={() => setSearch('')} className="ml-1 hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                )}
                {selectedCat && (
                  <span className="flex items-center gap-1 text-xs bg-primary-light text-primary px-2.5 py-1 rounded-chip font-medium">
                    {categoryEmoji[selectedCat]} {selectedCat}
                    <button onClick={() => setSelectedCat('')} className="ml-1 hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                )}
                {selectedCity && (
                  <span className="flex items-center gap-1 text-xs bg-earth-lighter text-earth px-2.5 py-1 rounded-chip font-medium">
                    <MapPin size={10} /> {selectedCity}
                    <button onClick={() => setSelectedCity('')} className="ml-1 hover:text-red-500">
                      <X size={10} />
                    </button>
                  </span>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayed.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  className="animate-fadeUp"
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Discover;
