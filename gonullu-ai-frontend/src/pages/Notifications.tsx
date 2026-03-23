import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../api/rewards';
import { formatRelative } from '../utils/formatDate';
import { cn } from '../utils/cn';
import Button from '../components/common/Button';
import ApiErrorState from '../components/common/ApiErrorState';

type NotifRow = {
  id: string;
  type: string;
  message: string;
  icon?: string;
  is_read: boolean;
  created_at: string;
};

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (p: number, append: boolean) => {
    if (append) setMoreLoading(true);
    else setLoading(true);
    setError(false);
    try {
      const { data } = await notificationsApi.list(p);
      const rows = data as NotifRow[];
      setHasMore(rows.length >= 20);
      setItems(prev => (append ? [...prev, ...rows] : rows));
      setPage(p);
    } catch {
      if (!append) setError(true);
      else toast.error('Daha fazla yüklenemedi');
    } finally {
      setLoading(false);
      setMoreLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    loadPage(1, false);
  }, [user, authLoading, navigate, loadPage]);

  const markRead = async (id: string) => {
    try {
      await notificationsApi.readOne(id);
      setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.readAll();
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Tümü okundu olarak işaretlendi');
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-earth-lighter/40">
        <Loader2 className="w-10 h-10 text-primary animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-white border border-earth-lighter text-text hover:border-primary/40 transition-colors shrink-0"
              aria-label="Panele dön"
            >
              <ArrowLeft size={20} aria-hidden />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
                <Bell size={22} className="text-primary shrink-0" aria-hidden />
                Bildirimler
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                Tüm duyurular ve hatırlatmalar
              </p>
            </div>
          </div>
          {items.some(n => !n.is_read) && (
            <Button type="button" variant="outline" size="sm" onClick={markAll} className="shrink-0">
              <CheckCheck size={16} aria-hidden />
              Tümünü okundu yap
            </Button>
          )}
        </div>

        {error && (
          <ApiErrorState
            title="Bildirimler yüklenemedi"
            message="Bağlantıyı kontrol edip yeniden dene."
            onRetry={() => loadPage(1, false)}
            compact
          />
        )}

        {!error && items.length === 0 && (
          <div
            className="card text-center py-12 text-text-muted"
            role="status"
          >
            <p className="text-4xl mb-2" aria-hidden>
              🔔
            </p>
            <p>Henüz bildirimin yok.</p>
            <Link to="/discover" className="inline-block mt-4 text-sm text-primary font-semibold hover:underline">
              Etkinliklere göz at →
            </Link>
          </div>
        )}

        {!error && items.length > 0 && (
          <ul className="space-y-2" aria-label="Bildirim listesi">
            {items.map(n => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={cn(
                    'w-full text-left rounded-2xl border p-4 transition-colors',
                    n.is_read
                      ? 'bg-white/80 border-earth-lighter'
                      : 'bg-primary-light/30 border-primary/25 shadow-sm'
                  )}
                >
                  <div className="flex gap-3">
                    <span className="text-2xl shrink-0" aria-hidden>
                      {n.icon || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text leading-snug">{n.message}</p>
                      <p className="text-xs text-text-muted mt-1.5">
                        {n.created_at ? formatRelative(n.created_at) : ''}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="Okunmadı" />
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!error && hasMore && items.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={moreLoading}
              onClick={() => loadPage(page + 1, true)}
            >
              {moreLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  Yükleniyor…
                </>
              ) : (
                'Daha fazla'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
