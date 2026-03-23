import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';

import { eventsApi } from '../api/events';

import type { Event } from '../types';

import type { User } from '../types';



export const DISCOVER_PAGE_SIZE = 24;



interface UseDiscoverEventsOptions {

  user: User | null;

}



interface UseDiscoverEventsReturn {

  events:            Event[];

  displayed:         Event[];

  loading:           boolean;

  loadError:         boolean;

  welcomeMsg:        string;

  search:            string;

  selectedCat:       string;

  selectedCity:      string;

  dateFrom:          string;

  dateTo:            string;

  nlInterpretation:  string;

  useAI:             boolean;

  activeFilterCount: number;

  nlParsing:         boolean;

  page:              number;

  totalCount:        number;

  pageSize:          number;

  hasPrev:           boolean;

  hasNext:           boolean;

  setSearch:         (v: string) => void;

  setSelectedCat:    (v: string) => void;

  setSelectedCity:   (v: string) => void;

  setDateFrom:       (v: string) => void;

  setDateTo:         (v: string) => void;

  setUseAI:          (fn: (prev: boolean) => boolean) => void;

  setPage:           Dispatch<SetStateAction<number>>;

  clearAll:          () => void;

  refetch:           () => void;

  applyNaturalLanguage: (q: string) => Promise<void>;

}



/**

 * Keşfet: sunucu tarafı q (başlık + kısa açıklama), sayfalama, tarih / NL filtreleri.

 */

export function useDiscoverEvents({ user }: UseDiscoverEventsOptions): UseDiscoverEventsReturn {

  const [events,           setEvents]           = useState<Event[]>([]);

  const [loading,          setLoading]          = useState(true);

  const [loadError,        setLoadError]        = useState(false);

  const [welcomeMsg,       setWelcomeMsg]       = useState('');

  const [search,           setSearch]           = useState('');

  const [debouncedSearch,  setDebouncedSearch]  = useState('');

  const [selectedCat,      setSelectedCat]      = useState('');

  const [selectedCity,     setSelectedCity]     = useState('');

  const [dateFrom,         setDateFrom]         = useState('');

  const [dateTo,           setDateTo]           = useState('');

  const [nlInterpretation, setNlInterpretation] = useState('');

  const [useAI,            setUseAI]            = useState(true);

  const [nlParsing,        setNlParsing]        = useState(false);

  const [page,             setPage]             = useState(1);

  const [totalCount,       setTotalCount]       = useState(0);

  const [pageSize,         setPageSize]         = useState(DISCOVER_PAGE_SIZE);



  useEffect(() => {

    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);

    return () => window.clearTimeout(t);

  }, [search]);



  useEffect(() => {

    setPage(1);

  }, [selectedCat, selectedCity, dateFrom, dateTo, debouncedSearch, useAI, user?.id]);



  const fetchEvents = useCallback(async () => {

    setLoading(true);

    setLoadError(false);

    try {

      const call = useAI && user ? eventsApi.discover : eventsApi.list;

      const { data, headers } = await call({

        category:  selectedCat  || undefined,

        city:      selectedCity || undefined,

        date_from: dateFrom     || undefined,

        date_to:   dateTo       || undefined,

        q:         debouncedSearch || undefined,

        page,

      });

      const list = Array.isArray(data) ? data : [];

      setEvents(list);

      const tc = parseInt(headers['x-total-count'] || '0', 10);

      const ps = parseInt(headers['x-page-size'] || String(DISCOVER_PAGE_SIZE), 10);

      setTotalCount(Number.isFinite(tc) ? tc : list.length);

      setPageSize(Number.isFinite(ps) ? ps : DISCOVER_PAGE_SIZE);



      if (user && useAI && list.length > 0) {

        setWelcomeMsg(

          `Merhaba ${user.full_name.split(' ')[0]}! Sana özel sıralama (sayfa ${page}).`

        );

      } else {

        setWelcomeMsg('');

      }

    } catch {

      setEvents([]);

      setTotalCount(0);

      setLoadError(true);

      setWelcomeMsg('');

    } finally {

      setLoading(false);

    }

  }, [useAI, selectedCat, selectedCity, dateFrom, dateTo, debouncedSearch, page, user]);



  useEffect(() => { void fetchEvents(); }, [fetchEvents]);



  const displayed = events;



  const activeFilterCount = [selectedCat, selectedCity, dateFrom, dateTo].filter(Boolean).length;



  const clearAll = () => {

    setSelectedCat('');

    setSelectedCity('');

    setDateFrom('');

    setDateTo('');

    setSearch('');

    setDebouncedSearch('');

    setNlInterpretation('');

    setPage(1);

  };



  const applyNaturalLanguage = async (q: string) => {

    const t = q.trim();

    if (!t) return;

    setNlParsing(true);

    setNlInterpretation('');

    try {

      const { data } = await eventsApi.parseDiscoverNaturalLanguage(t);

      if (data.category) setSelectedCat(data.category);

      else setSelectedCat('');

      if (data.city) setSelectedCity(data.city);

      else setSelectedCity('');

      if (data.date_from) setDateFrom(data.date_from.slice(0, 10));

      else setDateFrom('');

      if (data.date_to) setDateTo(data.date_to.slice(0, 10));

      else setDateTo('');

      if (data.q) setSearch(data.q);

      setNlInterpretation(data.interpretation || '');

      setPage(1);

    } finally {

      setNlParsing(false);

    }

  };



  const hasPrev = page > 1;

  const hasNext = page * pageSize < totalCount;



  return {

    events, displayed, loading, loadError, welcomeMsg,

    search, selectedCat, selectedCity, dateFrom, dateTo, nlInterpretation,

    useAI, activeFilterCount, nlParsing,

    page, totalCount, pageSize, hasPrev, hasNext,

    setSearch, setSelectedCat, setSelectedCity, setDateFrom, setDateTo, setUseAI, setPage,

    clearAll,

    refetch: fetchEvents,

    applyNaturalLanguage,

  };

}

