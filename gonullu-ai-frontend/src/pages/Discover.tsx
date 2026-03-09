import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { eventsApi } from '../api/events';
import type { Event } from '../types';
import EventCard from '../components/events/EventCard';
import Chip from '../components/common/Chip';
import { categoryEmoji } from '../utils/formatPoints';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = ['Çevre', 'Eğitim', 'Sağlık', 'Hayvan Hakları', 'Yaşlı Bakımı', 'Çocuk Gelişimi', 'Teknoloji', 'Sanat & Kültür'];
const CITIES     = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep'];

const Discover = () => {
  const { user }           = useAuth();
  const [events,           setEvents]           = useState<Event[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [useAI,            setUseAI]            = useState(true);
  const [search,           setSearch]           = useState('');
  const [selectedCat,      setSelectedCat]      = useState<string>('');
  const [selectedCity,     setSelectedCity]     = useState<string>('');
  const [showFilters,      setShowFilters]      = useState(false);
  const [welcomeMsg,       setWelcomeMsg]       = useState<string>('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = useAI && user ? eventsApi.discover : eventsApi.list;
      const { data } = await endpoint({
        category: selectedCat  || undefined,
        city:     selectedCity || undefined,
        q:        search       || undefined,
      });
      setEvents(data);

      if (user && useAI && data.length > 0) {
        setWelcomeMsg(`Merhaba ${user.full_name.split(' ')[0]}! Sana özel ${data.length} etkinlik sıralandı.`);
      }
    } finally {
      setLoading(false);
    }
  }, [useAI, selectedCat, selectedCity, user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-earth-lighter to-primary-light/20 border-b border-earth-lighter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              {welcomeMsg && (
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3 bg-primary-light px-4 py-2 rounded-chip w-fit animate-fadeIn">
                  <Sparkles size={14} />
                  {welcomeMsg}
                </div>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold text-text">
                {useAI && user ? '✨ AI ile Keşfet' : 'Etkinlikleri Keşfet'}
              </h1>
              <p className="text-text-soft mt-1">
                {loading ? 'Yükleniyor...' : `${events.length} etkinlik bulundu`}
                {selectedCat  && ` · ${selectedCat}`}
                {selectedCity && ` · ${selectedCity}`}
              </p>
            </div>

            {user && (
              <button
                onClick={() => setUseAI(!useAI)}
                className={`flex items-center gap-2 px-4 py-2 rounded-chip text-sm font-semibold border-2 transition-all ${
                  useAI
                    ? 'bg-primary text-white border-primary shadow-green'
                    : 'bg-transparent text-earth border-earth-light hover:bg-primary-light'
                }`}
              >
                <Sparkles size={15} />
                {useAI ? 'AI Sıralama Aktif' : 'AI Sıralamayı Aç'}
              </button>
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Etkinlik adı, şehir veya kategori ara..."
                className="input pl-11 pr-4"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                  <X size={16} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary px-6">Ara</button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl border-[1.5px] transition-colors ${showFilters ? 'bg-primary-light border-primary text-primary' : 'border-earth-light text-earth hover:bg-primary-light'}`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </form>

          {/* Category chips */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <Chip label="Tümü" active={!selectedCat} onClick={() => setSelectedCat('')} />
            {CATEGORIES.map(cat => (
              <Chip
                key={cat}
                label={`${categoryEmoji[cat]} ${cat}`}
                active={selectedCat === cat}
                onClick={() => setSelectedCat(selectedCat === cat ? '' : cat)}
              />
            ))}
          </div>

          {/* City filter */}
          {showFilters && (
            <div className="mt-4 animate-fadeIn">
              <p className="text-sm font-medium text-text-soft mb-2">Şehir</p>
              <div className="flex gap-2 flex-wrap">
                <Chip label="Tüm Şehirler" active={!selectedCity} onClick={() => setSelectedCity('')} />
                {CITIES.map(city => (
                  <Chip key={city} label={city} active={selectedCity === city} onClick={() => setSelectedCity(selectedCity === city ? '' : city)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event grid */}
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
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-semibold text-xl text-text mb-2">Etkinlik bulunamadı</h3>
            <p className="text-text-muted mb-4">Filtrelerini değiştirerek tekrar dene</p>
            <button onClick={() => { setSelectedCat(''); setSelectedCity(''); setSearch(''); }} className="btn-primary">
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                className="animate-fadeUp"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
