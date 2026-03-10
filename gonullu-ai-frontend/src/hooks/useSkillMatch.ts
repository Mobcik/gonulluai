import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/client';
import type { Event, User } from '../types';

interface EnrichedEvent extends Event {
  matchScore:    number;
  matchedSkills: string[];
}

interface UseSkillMatchOptions {
  events:  Event[];
  user:    User | null;
}

interface UseSkillMatchReturn {
  selected:      string[];
  search:        string;
  matchMode:     'any' | 'all';
  showAll:       boolean;
  aiReasons:     Record<string, string>;
  aiLoading:     boolean;
  enriched:      EnrichedEvent[];
  filtered:      EnrichedEvent[];
  aiPicks:       EnrichedEvent[];
  totalMatchCount: number;
  setSearch:     (v: string) => void;
  setMatchMode:  (v: 'any' | 'all') => void;
  setShowAll:    (v: boolean) => void;
  toggleSkill:   (skill: string) => void;
}

/**
 * Yetenek-etkinlik eşleştirme mantığını kapsar.
 *
 * - Seçili yeteneklere göre etkinlikleri puanlar ve sıralar.
 * - Gemini'ye debounce'lu istek atarak kişisel eşleşme nedenleri alır.
 * - İstemci tarafında metin araması ve eşleşme modu filtresi uygular.
 */
export function useSkillMatch({ events, user }: UseSkillMatchOptions): UseSkillMatchReturn {
  const [selected,  setSelected]  = useState<string[]>([]);
  const [search,    setSearch]    = useState('');
  const [matchMode, setMatchMode] = useState<'any' | 'all'>('any');
  const [showAll,   setShowAll]   = useState(false);
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userSkillSet = useMemo(() => new Set(user?.skills || []), [user]);

  // Profil yüklendiğinde kullanıcının ilk 3 yeteneğini öne seç
  useEffect(() => {
    if (user?.skills?.length) setSelected(user.skills.slice(0, 3));
  }, [user]);

  /** Her event'e eşleşme puanı ve eşleşen yetenek listesi ekle */
  const enriched = useMemo<EnrichedEvent[]>(() =>
    events
      .map(ev => {
        const needed   = ev.required_skills || [];
        const matched  = selected.filter(s => needed.includes(s));
        const bonus    = userSkillSet.size > 0 && needed.some(s => userSkillSet.has(s)) ? 0.5 : 0;
        return { ...ev, matchScore: matched.length + bonus, matchedSkills: matched };
      })
      .sort((a, b) => b.matchScore - a.matchScore),
    [events, selected, userSkillSet]
  );

  /** Metin araması + eşleşme modu filtresi */
  const filtered = useMemo<EnrichedEvent[]>(() =>
    enriched.filter(ev => {
      const needed = ev.required_skills || [];
      const sq     = search.toLowerCase();

      if (sq &&
        !ev.title.toLowerCase().includes(sq) &&
        !ev.category.toLowerCase().includes(sq) &&
        !(ev.short_description || '').toLowerCase().includes(sq)
      ) return false;

      if (!selected.length) return true;
      if (!needed.length)   return true; // zorunlu yetenek yok → herkese açık

      const matches = selected.filter(s => needed.includes(s));
      return matchMode === 'any'
        ? matches.length > 0
        : matches.length === selected.length;
    }),
    [enriched, search, selected, matchMode]
  );

  /** En iyi 3 AI önerisi */
  const aiPicks = useMemo<EnrichedEvent[]>(() =>
    enriched
      .filter(ev => ev.matchScore > 0 || (user?.skills?.length ?? 0) === 0)
      .slice(0, 3),
    [enriched, user]
  );

  const totalMatchCount = useMemo(
    () => enriched.filter(ev => ev.matchScore > 0).length,
    [enriched]
  );

  // aiPicks değişince Gemini'den eşleşme nedenleri al (600ms debounce)
  const aiPicksKey = aiPicks.map(e => e.id).join(',');
  useEffect(() => {
    if (!aiPicks.length) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const { data } = await api.post<{ event_id: string; reason: string }[]>(
          '/events/ai-skill-reasons',
          {
            skills: selected,
            events: aiPicks.map(ev => ({
              id:              ev.id,
              title:           ev.title,
              category:        ev.category,
              required_skills: ev.required_skills || [],
            })),
          },
        );
        const map: Record<string, string> = {};
        data.forEach(r => { map[r.event_id] = r.reason; });
        setAiReasons(map);
      } catch {
        // Fallback metin bileşen içinde üretilir
      } finally {
        setAiLoading(false);
      }
    }, 600);
  }, [aiPicksKey, selected.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSkill = (s: string) => {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    setShowAll(false);
  };

  return {
    selected, search, matchMode, showAll,
    aiReasons, aiLoading,
    enriched, filtered, aiPicks, totalMatchCount,
    setSearch, setMatchMode, setShowAll,
    toggleSkill,
  };
}
