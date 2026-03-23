import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { coachChat } from '../api/coach';
import { cn } from '../utils/cn';

type Role = 'user' | 'assistant';

interface Msg {
  id: string;
  role: Role;
  text: string;
}

const Coach = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text:
          'Merhaba! Profilindeki şehir, ilgi alanları ve yetenekler ile yaklaşan açık etkinliklere göre yorum yapabilirim. Örneğin: "Hangi etkinlik bana uygun?"',
      },
    ]);
  }, [user, authLoading, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !user) return;
    setInput('');
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages(m => [...m, userMsg]);
    setSending(true);
    try {
      const { reply } = await coachChat(text);
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: reply }]);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        toast.error('Çok sık istek gönderildi. Bir süre sonra tekrar dene.');
      } else {
        toast.error('Yanıt alınamadı. Bağlantını kontrol edip tekrar dene.');
      }
      setMessages(m => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'Şu an yanıt veremedim. Sayfayı yenileyip tekrar dene veya biraz sonra gel.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-lighter/40 pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-primary-light flex items-center justify-center text-primary">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-text">Mini koç</h1>
            <p className="text-sm text-text-muted">
              Profilin ve yaklaşan etkinliklere göre kısa öneriler — saatte en fazla 20 soru.
            </p>
          </div>
        </div>

        <div
          className={cn(
            'bg-white rounded-2xl shadow-card border border-earth-lighter',
            'flex flex-col h-[min(70vh,560px)] overflow-hidden',
          )}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(m => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-white rounded-br-md'
                    : 'mr-auto bg-earth-lighter text-text rounded-bl-md',
                )}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="mr-auto flex items-center gap-2 text-text-muted text-sm px-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Düşünüyorum…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-earth-lighter bg-white">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Örn. Hangi etkinlik bana uygun?"
                rows={2}
                maxLength={1200}
                disabled={sending}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-earth-light px-3 py-2.5 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                  'disabled:opacity-60',
                )}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                className={cn(
                  'shrink-0 h-11 w-11 rounded-xl flex items-center justify-center',
                  'bg-primary text-white shadow-green hover:bg-primary-dark transition-colors',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
                aria-label="Gönder"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2 px-1">
              Yanıtlar öneridir; kayıt için{' '}
              <Link to="/discover" className="text-primary font-medium hover:underline">
                Keşfet
              </Link>
              ’i kullan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coach;
