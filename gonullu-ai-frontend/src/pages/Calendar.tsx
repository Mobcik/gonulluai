import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Download, MapPin, List, LayoutGrid,
} from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks, startOfDay,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { eventsApi } from '../api/events';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Event } from '../types';
import { categoryEmoji, badgeInfo } from '../utils/formatPoints';
import { cn } from '../utils/cn';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Çevre':          { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  'Eğitim':         { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  'Sağlık':         { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  'Hayvan Hakları': { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Yaşlı Bakımı':   { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  'Çocuk Gelişimi': { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  'Teknoloji':      { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  'Sanat & Kültür': { bg: 'bg-pink-100',   text: 'text-pink-800',   dot: 'bg-pink-500'   },
};

const getColor = (cat: string) =>
  CATEGORY_COLORS[cat] || { bg: 'bg-earth-lighter', text: 'text-earth', dot: 'bg-earth' };

type View = 'month' | 'week' | 'list';

const Calendar = () => {
  const { user }  = useAuth();
  const [current, setCurrent] = useState(new Date());
  const [view,    setView]    = useState<View>('month');
  const [events,  setEvents]  = useState<Event[]>([]);
  const [myIds,   setMyIds]   = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Event | null>(null);

  useEffect(() => {
    eventsApi.discover({ page: 1 })
      .then(r => setEvents(r.data))
      .catch(() => {});

    if (user) {
      api.get<Event[]>(`/users/${user.id}/events`)
        .then(r => setMyIds(new Set(r.data.map((e: Event) => e.id))))
        .catch(() => {});
    }
  }, [user]);

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.event_date), day));

  /* ── Google Calendar export ─────────────────────────── */
  const exportToICS = () => {
    const joined = events.filter(e => myIds.has(e.id));
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GönüllüAI//TR',
      'CALSCALE:GREGORIAN',
    ];
    joined.forEach(ev => {
      const start = format(new Date(ev.event_date), "yyyyMMdd'T'HHmmss");
      const end   = ev.end_time
        ? format(new Date(ev.end_time), "yyyyMMdd'T'HHmmss")
        : format(new Date(new Date(ev.event_date).getTime() + 3 * 3600000), "yyyyMMdd'T'HHmmss");
      lines.push(
        'BEGIN:VEVENT',
        `UID:gonulluai-${ev.id}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${ev.title}`,
        `DESCRIPTION:${ev.short_description || ''}`,
        `LOCATION:${ev.city || ''}${ev.address ? ', ' + ev.address : ''}`,
        'END:VEVENT',
      );
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'gonulluai-takvim.ics';
    a.click();
  };

  /* ── Ay görünümü ────────────────────────────────────── */
  const MonthView = () => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(current),     { weekStartsOn: 1 });
    const days  = eachDayOfInterval({ start, end });
    const DAYS  = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-earth-lighter">
          {DAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvs   = eventsOnDay(day);
            const inMonth  = isSameMonth(day, current);
            const todayDay = isToday(day);
            return (
              <div
                key={i}
                className={cn(
                  'min-h-[90px] p-1.5 border-b border-r border-earth-lighter/60',
                  !inMonth && 'bg-earth-lighter/20',
                  i % 7 === 6 && 'border-r-0',
                )}
              >
                <div className={cn(
                  'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1',
                  todayDay ? 'bg-primary text-white' : inMonth ? 'text-text' : 'text-text-muted'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvs.slice(0, 3).map(ev => {
                    const c = getColor(ev.category);
                    const isJoined = myIds.has(ev.id);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelected(ev)}
                        className={cn(
                          'w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate',
                          isJoined
                            ? 'bg-primary text-white font-semibold'
                            : `${c.bg} ${c.text}`
                        )}
                        title={ev.title}
                      >
                        {ev.title}
                      </button>
                    );
                  })}
                  {dayEvs.length > 3 && (
                    <p className="text-[10px] text-text-muted pl-1">+{dayEvs.length - 3} daha</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Hafta görünümü ─────────────────────────────────── */
  const WeekView = () => {
    const start = startOfWeek(current, { weekStartsOn: 1 });
    const end   = endOfWeek(current,   { weekStartsOn: 1 });
    const days  = eachDayOfInterval({ start, end });
    const DAYS  = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-earth-lighter">
          {days.map((day, i) => (
            <div key={i} className="py-3 text-center border-r last:border-r-0 border-earth-lighter">
              <p className="text-xs text-text-muted">{DAYS[i]}</p>
              <p className={cn(
                'text-base font-bold mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto',
                isToday(day) ? 'bg-primary text-white' : 'text-text'
              )}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[300px]">
          {days.map((day, i) => {
            const dayEvs = eventsOnDay(day);
            return (
              <div key={i} className="p-2 border-r last:border-r-0 border-earth-lighter space-y-1.5">
                {dayEvs.map(ev => {
                  const c = getColor(ev.category);
                  const isJoined = myIds.has(ev.id);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelected(ev)}
                      className={cn(
                        'w-full text-left p-2 rounded-lg text-xs',
                        isJoined ? 'bg-primary text-white font-semibold' : `${c.bg} ${c.text}`
                      )}
                    >
                      <p className="font-semibold truncate">{ev.title}</p>
                      <p className="opacity-80 mt-0.5">{format(new Date(ev.event_date), 'HH:mm')}</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Liste görünümü ─────────────────────────────────── */
  const ListView = () => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    const future = sorted.filter(e => new Date(e.event_date) >= startOfDay(new Date()));

    // Tarihe göre grupla
    const groups: Record<string, Event[]> = {};
    future.forEach(ev => {
      const key = format(new Date(ev.event_date), 'd MMMM yyyy', { locale: tr });
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });

    return (
      <div className="space-y-6">
        {Object.entries(groups).map(([date, evs]) => (
          <div key={date}>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
              <CalendarIcon size={13} /> {date}
            </h3>
            <div className="space-y-2">
              {evs.map(ev => {
                const c = getColor(ev.category);
                const isJoined = myIds.has(ev.id);
                return (
                  <Link
                    key={ev.id}
                    to={`/events/${ev.id}`}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-2xl transition-all hover:-translate-y-0.5',
                      isJoined ? 'bg-primary/10 border border-primary/30' : 'bg-white shadow-card hover:shadow-card-hover'
                    )}
                  >
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0', c.bg)}>
                      {categoryEmoji[ev.category] || '🌿'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text truncate">{ev.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                        <span>{format(new Date(ev.event_date), 'HH:mm')}</span>
                        <span className="flex items-center gap-1"><MapPin size={10} /> {ev.city}</span>
                        <span className={cn('px-2 py-0.5 rounded-chip', c.bg, c.text)}>{ev.category}</span>
                      </div>
                    </div>
                    {isJoined && (
                      <span className="bg-primary text-white text-xs px-2.5 py-1 rounded-chip font-semibold flex-shrink-0">
                        ✓ Katıldım
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(groups).length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <CalendarIcon size={40} className="mx-auto mb-3 opacity-20" />
            <p>Yaklaşan etkinlik yok</p>
          </div>
        )}
      </div>
    );
  };

  const prev = () => {
    if (view === 'month') setCurrent(subMonths(current, 1));
    else if (view === 'week') setCurrent(subWeeks(current, 1));
  };
  const next = () => {
    if (view === 'month') setCurrent(addMonths(current, 1));
    else if (view === 'week') setCurrent(addWeeks(current, 1));
  };

  const headerLabel = view === 'month'
    ? format(current, 'MMMM yyyy', { locale: tr })
    : view === 'week'
      ? `${format(startOfWeek(current, { weekStartsOn: 1 }), 'd MMM', { locale: tr })} – ${format(endOfWeek(current, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: tr })}`
      : 'Tüm Etkinlikler';

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
              <CalendarIcon size={24} className="text-primary" /> Etkinlik Takvimi
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {events.length} etkinlik · {myIds.size} katıldığın
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Görünüm seçici */}
            <div className="flex bg-white rounded-xl shadow-card p-1 gap-1">
              {([['month', <LayoutGrid size={15} />, 'Ay'], ['week', <CalendarIcon size={15} />, 'Hafta'], ['list', <List size={15} />, 'Liste']] as const).map(([v, icon, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    view === v ? 'bg-primary text-white' : 'text-text-soft hover:text-text'
                  )}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Google Calendar export */}
            {user && myIds.size > 0 && (
              <button
                onClick={exportToICS}
                className="flex items-center gap-2 bg-white text-text shadow-card px-3 py-2 rounded-xl text-xs font-semibold hover:shadow-card-hover transition-all"
              >
                <Download size={14} className="text-primary" />
                Google Calendar'a Aktar
              </button>
            )}
          </div>
        </div>

        {/* Navigasyon (ay/hafta) */}
        {view !== 'list' && (
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="p-2 rounded-xl hover:bg-white hover:shadow-card transition-all">
              <ChevronLeft size={20} className="text-text-soft" />
            </button>
            <h2 className="font-semibold text-text capitalize">
              {headerLabel}
            </h2>
            <button onClick={next} className="p-2 rounded-xl hover:bg-white hover:shadow-card transition-all">
              <ChevronRight size={20} className="text-text-soft" />
            </button>
          </div>
        )}

        {/* Renk legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Katıldıklarım
          </span>
          {Object.entries(CATEGORY_COLORS).slice(0, 4).map(([cat, c]) => (
            <span key={cat} className="flex items-center gap-1.5 text-text-muted">
              <span className={cn('w-3 h-3 rounded-full inline-block', c.dot)} /> {cat}
            </span>
          ))}
        </div>

        {/* Takvim alanı */}
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'list'  && <ListView />}

        {/* Seçili etkinlik popup */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fadeIn"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{categoryEmoji[selected.category] || '🌿'}</span>
                <div>
                  <h3 className="font-bold text-text">{selected.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{selected.category} · {selected.city}</p>
                </div>
              </div>
              <p className="text-sm text-text-soft mb-4">{selected.short_description}</p>
              <div className="flex gap-3">
                <Link
                  to={`/events/${selected.id}`}
                  className="flex-1 btn-primary py-2 text-sm text-center"
                  onClick={() => setSelected(null)}
                >
                  Detayları Gör
                </Link>
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-xl border border-earth-lighter text-sm text-text-soft hover:bg-earth-lighter"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
