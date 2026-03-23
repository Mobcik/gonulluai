import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Plus, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../api/events';
import type { Event } from '../types';
import EventCard from '../components/events/EventCard';
import ApiErrorState from '../components/common/ApiErrorState';

const EventsOrganized = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await eventsApi.listMineCreated();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
      setError(true);
      toast.error('Liste yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pt-20 pb-16 bg-earth-lighter/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-text-soft hover:text-text mb-3"
            >
              <ArrowLeft size={16} />
              Panele dön
            </Link>
            <h1 className="font-display text-3xl font-bold text-text flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-primary-light flex items-center justify-center">
                <PenLine size={22} className="text-primary" />
              </span>
              Oluşturduğum etkinlikler
            </h1>
            <p className="text-text-soft mt-2 max-w-xl">
              Burada yalnızca senin oluşturduğun etkinlikler listelenir; başkalarının etkinlikleri görünmez.
            </p>
          </div>
          <Link
            to="/events/new"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-green hover:bg-primary-dark transition-colors shrink-0"
          >
            <Plus size={18} />
            Yeni etkinlik
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={40} className="text-primary animate-spin" />
          </div>
        ) : error ? (
          <ApiErrorState title="Liste alınamadı" onRetry={load} className="max-w-md mx-auto" />
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-10 text-center max-w-lg mx-auto">
            <p className="text-text-soft mb-6">
              Henüz oluşturduğun bir etkinlik yok. İlk etkinliğini oluşturarak topluluğu davet et.
            </p>
            <Link to="/events/new" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl">
              <Plus size={18} />
              Etkinlik oluştur
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(ev => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsOrganized;
