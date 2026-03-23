import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, X } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatRelative } from '../utils/formatDate';
import { cn } from '../utils/cn';

interface Notif {
  id:         string;
  type:       string;
  message:    string;
  icon:       string;
  is_read:    boolean;
  created_at: string;
}

const NotificationPanel = () => {
  const { user }              = useAuth();
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef              = useRef<HTMLDivElement>(null);

  // Okunmamış sayısını belirli aralıklarla çek
  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      api.get<{ count: number }>('/notifications/unread-count')
        .then(r => setCount(r.data.count))
        .catch(() => {});
    };
    fetchCount();
    const timer = setInterval(fetchCount, 30_000);
    return () => clearInterval(timer);
  }, [user]);

  // Panel açıldığında bildirimleri yükle
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get<Notif[]>('/notifications/')
      .then(r => setNotifs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setCount(0);
  };

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setCount(prev => Math.max(0, prev - 1));
  };

  if (!user) return null;

  return (
    <div ref={panelRef} className="relative">
      {/* Zil butonu */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'relative p-2 rounded-full transition-colors',
          open
            ? 'bg-primary-light text-primary'
            : 'text-text-soft hover:text-text hover:bg-earth-lighter'
        )}
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown paneli */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-card-hover border border-earth-lighter overflow-hidden animate-fadeIn z-50">
          {/* Başlık */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-earth-lighter">
            <h3 className="font-semibold text-text text-sm flex items-center gap-2">
              <Bell size={15} className="text-primary" />
              Bildirimler
              {count > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {count}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary-light transition-colors"
                >
                  <CheckCheck size={13} />
                  Tümünü oku
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-text-muted hover:text-text hover:bg-earth-lighter rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Henüz bildirim yok</p>
                <p className="text-xs mt-1 opacity-70">Etkinliklere katılınca burada görünür</p>
              </div>
            ) : (
              <div>
                {notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors border-b border-earth-lighter/50 last:border-0',
                      !n.is_read
                        ? 'bg-primary-light/40 hover:bg-primary-light/60'
                        : 'hover:bg-earth-lighter'
                    )}
                  >
                    {/* İkon */}
                    <span className="text-lg flex-shrink-0 mt-0.5">{n.icon}</span>

                    {/* İçerik */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-xs leading-relaxed',
                        !n.is_read
                          ? 'font-semibold text-text'
                          : 'text-text-soft'
                      )}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">
                        {n.created_at ? formatRelative(n.created_at) : ''}
                      </p>
                    </div>

                    {/* Okunmamış noktası */}
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alt footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-earth-lighter bg-earth-lighter/30">
              <Link
                to="/notifications"
                className="block text-center text-[11px] font-semibold text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Tüm bildirimler →
              </Link>
              <p className="text-[10px] text-text-muted text-center mt-1">
                Son {notifs.length} bildirim
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
