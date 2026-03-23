import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Sparkles, X, MapPin, Tag, Loader2, Wand2, CalendarRange } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useDiscoverEvents } from '../hooks/useDiscoverEvents';
import EventCard from '../components/events/EventCard';
import Chip from '../components/common/Chip';
import ApiErrorState from '../components/common/ApiErrorState';
import { categoryEmoji } from '../utils/formatPoints';
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
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams] = useSearchParams();

  const {
    displayed, loading, loadError, welcomeMsg,
    search, selectedCat, selectedCity, dateFrom, dateTo, nlInterpretation,
    useAI, activeFilterCount, nlParsing,
    page, totalCount, pageSize, hasPrev, hasNext, setPage,
    setSearch, setSelectedCat, setSelectedCity, setDateFrom, setDateTo, setUseAI,
    clearAll,
    refetch,
    applyNaturalLanguage,
  } = useDiscoverEvents({ user });

  const [nlQuery, setNlQuery] = useState('');

  const handleClearAll = () => {
    clearAll();
    setNlQuery('');
  };

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && CATEGORIES.includes(cat)) setSelectedCat(cat);
  }, [searchParams, setSelectedCat]);

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
                  : totalCount > 0
                    ? `Bu sayfada ${displayed.length} · Toplam ${totalCount} etkinlik`
                    : `${displayed.length} etkinlik`
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

            {(activeFilterCount > 0 || search || nlQuery) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-[1.5px] border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-all"
              >
                <X size={15} />
                <span className="hidden sm:inline">Temizle</span>
              </button>
            )}
          </div>

          {/* ── Doğal dil + tarih ───────────────────────────────────────── */}
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-earth-lighter">
              <p className="text-xs font-semibold text-text-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Wand2 size={12} /> Doğal dil ile ara
              </p>
              <p className="text-xs text-text-muted mb-2">
                Örn. yarın İstanbul çevre etkinliği — şehir, kategori ve tarih filtreleri doldurulur.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={nlQuery}
                  onChange={e => setNlQuery(e.target.value)}
                  placeholder="Ne arıyorsun?"
                  className="input flex-1"
                  disabled={nlParsing}
                />
                <button
                  type="button"
                  disabled={nlParsing || !nlQuery.trim()}
                  onClick={async () => {
                    try {
                      await applyNaturalLanguage(nlQuery);
                      toast.success('Filtreler güncellendi');
                    } catch {
                      toast.error('Ayrıştırma başarısız');
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-green hover:bg-primary-dark disabled:opacity-40"
                >
                  {nlParsing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  Uygula
                </button>
              </div>
              {nlInterpretation && (
                <p className="text-xs text-primary mt-2 font-medium">{nlInterpretation}</p>
              )}
            </div>

            <div className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-earth-lighter flex flex-wrap gap-4 items-end">
              <p className="text-xs font-semibold text-text-soft uppercase tracking-wide w-full flex items-center gap-1.5 mb-0">
                <CalendarRange size={12} /> Tarih aralığı
              </p>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Başlangıç
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="input text-sm py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Bitiş
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="input text-sm py-2"
                />
              </label>
            </div>
          </div>

          {/* ── Kategori Chip'leri ──────────────────────────────────────── */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scroll-smooth">
            <Chip label="Tümü" active={!selectedCat} onClick={() => setSelectedCat('')} />
            {CATEGORIES.map(cat => (
              <Chip
                key={cat}
                label={`${categoryEmoji[cat] || ''} ${cat}`}
                active={selectedCat === cat}
                onClick={() => setSelectedCat(selectedCat === cat ? '' : cat)}
              />
            ))}
          </div>

          {/* ── Şehir Filtresi ─────────────────────────────────────────── */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-earth-lighter animate-fadeIn">
              <p className="text-xs font-semibold text-text-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MapPin size={12} /> Şehir
              </p>
              <div className="flex gap-2 flex-wrap">
                <Chip label="Tüm Şehirler" active={!selectedCity} onClick={() => setSelectedCity('')} />
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
                </div>
              </div>
            ))}
          </div>
        ) : loadError && displayed.length === 0 ? (
          <ApiErrorState
            title="Etkinlikler yüklenemedi"
            onRetry={refetch}
            className="max-w-lg mx-auto"
          />
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-semibold text-xl text-text mb-2">Etkinlik bulunamadı</h3>
            <p className="text-text-muted mb-6">
              {search ? `"${search}" için sonuç bulunamadı` : 'Seçili filtrelerle eşleşen etkinlik yok'}
            </p>
            <button type="button" onClick={handleClearAll} className="btn-primary px-8">Filtreleri Temizle</button>
          </div>
        ) : (
          <>
            {(search || activeFilterCount > 0) && (
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <p className="text-sm text-text-muted">
                  <strong className="text-text">{displayed.length}</strong> sonuç
                </p>
                {search && (
                  <span className="flex items-center gap-1 text-xs bg-earth-lighter text-text px-2.5 py-1 rounded-chip">
                    <Tag size={10} /> "{search}"
                    <button onClick={() => setSearch('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
                  </span>
                )}
                {selectedCat && (
                  <span className="flex items-center gap-1 text-xs bg-primary-light text-primary px-2.5 py-1 rounded-chip font-medium">
                    {categoryEmoji[selectedCat]} {selectedCat}
                    <button onClick={() => setSelectedCat('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
                  </span>
                )}
                {selectedCity && (
                  <span className="flex items-center gap-1 text-xs bg-earth-lighter text-earth px-2.5 py-1 rounded-chip font-medium">
                    <MapPin size={10} /> {selectedCity}
                    <button onClick={() => setSelectedCity('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
                  </span>
                )}
                {dateFrom && (
                  <span className="flex items-center gap-1 text-xs bg-earth-lighter text-text px-2.5 py-1 rounded-chip font-medium">
                    <CalendarRange size={10} /> {dateFrom}
                    <button type="button" onClick={() => setDateFrom('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
                  </span>
                )}
                {dateTo && (
                  <span className="flex items-center gap-1 text-xs bg-earth-lighter text-text px-2.5 py-1 rounded-chip font-medium">
                    → {dateTo}
                    <button type="button" onClick={() => setDateTo('')} className="ml-1 hover:text-red-500"><X size={10} /></button>
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

            {totalCount > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 pb-4">
                <button
                  type="button"
                  disabled={!hasPrev || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-5 py-2.5 rounded-xl border border-earth-light text-sm font-semibold text-text hover:bg-earth-lighter disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <span className="text-sm text-text-muted">
                  Sayfa {page} · {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} / {totalCount}
                </span>
                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => setPage(p => p + 1)}
                  className="px-5 py-2.5 rounded-xl border border-earth-light text-sm font-semibold text-text hover:bg-earth-lighter disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Discover;
