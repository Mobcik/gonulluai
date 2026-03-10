import { useState, useEffect, useCallback, useMemo } from 'react';
import { eventsApi } from '../api/events';
import type { Event } from '../types';
import type { User } from '../types';

interface UseDiscoverEventsOptions {
  user: User | null;
}

interface UseDiscoverEventsReturn {
  events:           Event[];
  displayed:        Event[];
  loading:          boolean;
  welcomeMsg:       string;
  search:           string;
  selectedCat:      string;
  selectedCity:     string;
  useAI:            boolean;
  activeFilterCount: number;
  setSearch:        (v: string) => void;
  setSelectedCat:   (v: string) => void;
  setSelectedCity:  (v: string) => void;
  setUseAI:         (fn: (prev: boolean) => boolean) => void;
  clearAll:         () => void;
}

/**
 * Etkinlik keşfi için tüm state ve side-effect mantığını kapsar.
 *
 * - Kategori / şehir / AI modu değişimlerinde sunucu isteği atar.
 * - Metin araması anlık olarak istemci tarafında filtrelenir.
 */
export function useDiscoverEvents({ user }: UseDiscoverEventsOptions): UseDiscoverEventsReturn {
  const [events,      setEvents]      = useState<Event[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [welcomeMsg,  setWelcomeMsg]  = useState('');
  const [search,      setSearch]      = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedCity,setSelectedCity]= useState('');
  const [useAI,       setUseAI]       = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const call = useAI && user ? eventsApi.discover : eventsApi.list;
      const { data } = await call({
        category: selectedCat  || undefined,
        city:     selectedCity || undefined,
      });
      const list = Array.isArray(data) ? data : [];
      setEvents(list);

      if (user && useAI && list.length > 0) {
        setWelcomeMsg(
          `Merhaba ${user.full_name.split(' ')[0]}! Sana özel ${list.length} etkinlik sıralandı.`
        );
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

  /** Metin araması — API çağrısı yapmadan anlık filtreler */
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

  const activeFilterCount = [selectedCat, selectedCity].filter(Boolean).length;

  const clearAll = () => {
    setSelectedCat('');
    setSelectedCity('');
    setSearch('');
  };

  return {
    events, displayed, loading, welcomeMsg,
    search, selectedCat, selectedCity, useAI,
    activeFilterCount,
    setSearch, setSelectedCat, setSelectedCity, setUseAI,
    clearAll,
  };
}
