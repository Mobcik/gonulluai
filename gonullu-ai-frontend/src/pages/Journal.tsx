import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Edit, Trash2, Save, X,
  Smile, ThumbsUp, Zap, Moon, Layers, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatRelative } from '../utils/formatDate';
import { categoryEmoji } from '../utils/formatPoints';
import { cn } from '../utils/cn';

interface JournalEntry {
  id:               string;
  event_id:         string | null;
  event_title:      string | null;
  event_date:       string | null;
  event_category:   string | null;
  title:            string;
  content:          string;
  mood:             string;
  impact_note:      string | null;
  skills_used:      string[];
  is_public:        boolean;
  created_at:       string;
}

const MOODS = [
  { key: 'happy',     emoji: '😊', label: 'Mutlu',    icon: <Smile   size={16} /> },
  { key: 'proud',     emoji: '🦁', label: 'Gururlu',  icon: <ThumbsUp size={16} /> },
  { key: 'motivated', emoji: '⚡', label: 'Motive',   icon: <Zap     size={16} /> },
  { key: 'tired',     emoji: '😴', label: 'Yorgun',   icon: <Moon    size={16} /> },
  { key: 'mixed',     emoji: '🌀', label: 'Karışık',  icon: <Layers  size={16} /> },
];

const SKILL_OPTIONS = [
  'İletişim', 'Liderlik', 'Yazılım', 'Tasarım', 'Öğretmenlik',
  'Sosyal Medya', 'Fotoğrafçılık', 'Tercüme', 'Müzik', 'Psikoloji',
];

interface FormState {
  title:       string;
  content:     string;
  mood:        string;
  impact_note: string;
  skills_used: string[];
  is_public:   boolean;
  event_id:    string;
}

const EMPTY: FormState = {
  title: '', content: '', mood: 'happy',
  impact_note: '', skills_used: [], is_public: false, event_id: '',
};

const Journal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate    = useNavigate();
  const [entries,   setEntries]   = useState<JournalEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<string | null>(null);
  const [form,      setForm]      = useState<FormState>(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get<JournalEntry[]>('/journal/')
      .then(r => setEntries(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditing(entry.id);
    setForm({
      title:       entry.title,
      content:     entry.content,
      mood:        entry.mood,
      impact_note: entry.impact_note || '',
      skills_used: entry.skills_used,
      is_public:   entry.is_public,
      event_id:    entry.event_id || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Başlık ve içerik zorunlu');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        event_id:    form.event_id || null,
        impact_note: form.impact_note || null,
      };
      if (editing) {
        const { data } = await api.put<JournalEntry>(`/journal/${editing}`, payload);
        setEntries(prev => prev.map(e => e.id === editing ? data : e));
        toast.success('Güncellendi!');
      } else {
        const { data } = await api.post<JournalEntry>('/journal/', payload);
        setEntries(prev => [data, ...prev]);
        toast.success('Günlük yazısı eklendi!');
      }
      setShowForm(false);
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğine emin misin?')) return;
    await api.delete(`/journal/${id}`).catch(() => {});
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Silindi');
  };

  const toggleSkill = (s: string) => {
    setForm(f => ({
      ...f,
      skills_used: f.skills_used.includes(s)
        ? f.skills_used.filter(x => x !== s)
        : [...f.skills_used, s],
    }));
  };

  if (!user) return null;

  const moodMeta = (key: string) => MOODS.find(m => m.key === key) || MOODS[0];

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-text flex items-center gap-2">
              <BookOpen size={24} className="text-primary" /> Gönüllü Günlüğüm
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {entries.length} yazı · Deneyimlerini kaydet, büyümeni izle
            </p>
          </div>
          <button
            onClick={openCreate}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5"
          >
            <Plus size={16} /> Yazı Ekle
          </button>
        </div>

        {/* Yazı oluşturma / düzenleme formu */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-card-hover p-6 mb-6 border border-primary/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-text">
                {editing ? 'Yazıyı Düzenle' : 'Yeni Günlük Yazısı'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-earth-lighter">
                <X size={18} className="text-text-soft" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Başlık */}
              <input
                type="text"
                placeholder="Yazı başlığı..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input w-full text-base font-semibold"
              />

              {/* İçerik */}
              <textarea
                placeholder="Bu etkinlikte neler öğrendim? Nasıl hissettim? Ne gibi zorluklarla karşılaştım?..."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={6}
                className="input w-full resize-none text-sm leading-relaxed"
              />

              {/* Etki notu */}
              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-1.5">
                  Etki Notum (opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Bu etkinliğin dünyaya katkısı ne oldu?"
                  value={form.impact_note}
                  onChange={e => setForm(f => ({ ...f, impact_note: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>

              {/* Ruh hali */}
              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-2">
                  Nasıl Hissettin?
                </label>
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, mood: m.key }))}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                        form.mood === m.key
                          ? 'bg-primary text-white border-primary shadow-green'
                          : 'border-earth-lighter text-text-soft hover:border-primary/50'
                      )}
                    >
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kullandığım yetenekler */}
              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-2">
                  Kullandığım Yetenekler
                </label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      className={cn(
                        'chip text-xs',
                        form.skills_used.includes(s) ? 'chip-active' : 'chip-inactive'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Herkese açık */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors relative flex-shrink-0',
                    form.is_public ? 'bg-primary' : 'bg-earth-lighter'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                    form.is_public ? 'left-5' : 'left-1'
                  )} />
                </div>
                <span className="text-sm text-text">Profilimde herkese göster</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-60"
                >
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Save size={15} />}
                  {editing ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-earth-lighter text-sm text-text-soft hover:bg-earth-lighter"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Yazı listesi */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <BookOpen size={48} className="mx-auto mb-4 text-earth opacity-30" />
            <h3 className="font-semibold text-text mb-2">Henüz günlük yazısı yok</h3>
            <p className="text-sm text-text-muted mb-6">
              Etkinlik sonrası deneyimlerini yaz, büyümeni takip et
            </p>
            <button onClick={openCreate} className="btn-primary px-6 py-2.5 inline-flex items-center gap-2">
              <Plus size={16} /> İlk yazıyı ekle
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => {
              const mood = moodMeta(entry.mood);
              const isExp = expanded === entry.id;
              return (
                <div key={entry.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                  {/* Üst şerit */}
                  {entry.event_category && (
                    <div className="h-1 bg-gradient-to-r from-primary to-earth" />
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0 mt-0.5">{mood.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setExpanded(isExp ? null : entry.id)}
                            className="text-left group"
                          >
                            <h3 className="font-bold text-text group-hover:text-primary transition-colors">
                              {entry.title}
                            </h3>
                          </button>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {entry.event_title && (
                              <Link
                                to={`/events/${entry.event_id}`}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Calendar size={10} />
                                {entry.event_title}
                              </Link>
                            )}
                            <span className="text-xs text-text-muted">{formatRelative(entry.created_at)}</span>
                            {entry.is_public && (
                              <span className="text-xs bg-earth-lighter text-earth px-1.5 py-0.5 rounded-chip">Herkese açık</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-1.5 rounded-lg hover:bg-earth-lighter text-text-muted hover:text-primary transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Kısa önizleme */}
                    <p className={cn(
                      'text-sm text-text-soft mt-3 leading-relaxed',
                      !isExp && 'line-clamp-3'
                    )}>
                      {entry.content}
                    </p>

                    {/* Detaylar (expanded) */}
                    {isExp && (
                      <div className="mt-4 space-y-3">
                        {entry.impact_note && (
                          <div className="bg-primary-light rounded-xl p-3">
                            <p className="text-xs font-semibold text-primary mb-1">🌱 Etki Notum</p>
                            <p className="text-sm text-text">{entry.impact_note}</p>
                          </div>
                        )}
                        {entry.skills_used.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-text-muted mb-2">Kullandığım yetenekler:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {entry.skills_used.map(s => (
                                <span key={s} className="chip chip-inactive text-xs">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {entry.content.length > 200 && (
                      <button
                        onClick={() => setExpanded(isExp ? null : entry.id)}
                        className="text-xs text-primary hover:underline mt-2 block"
                      >
                        {isExp ? 'Daha az göster' : 'Devamını oku...'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Journal;
