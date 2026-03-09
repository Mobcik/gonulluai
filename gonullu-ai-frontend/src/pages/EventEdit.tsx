import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, Upload, X, Link as LinkIcon, Save, Trash2 } from 'lucide-react';
import { eventsApi } from '../api/events';
import api from '../api/client';
import type { EventCategory, Event } from '../types';
import Chip from '../components/common/Chip';
import Button from '../components/common/Button';
import { categoryEmoji } from '../utils/formatPoints';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const CATEGORIES: EventCategory[] = [
  'Çevre', 'Eğitim', 'Sağlık', 'Hayvan Hakları',
  'Yaşlı Bakımı', 'Çocuk Gelişimi', 'Teknoloji', 'Sanat & Kültür',
];
const SKILLS = [
  'İletişim', 'Organizasyon', 'Eğitim', 'Teknik', 'Sağlık',
  'Fiziksel Aktivite', 'Sanat', 'Teknoloji', 'Yabancı Dil', 'Sürücü Belgesi',
];
const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
  'Gaziantep', 'Kayseri', 'Mersin', 'Samsun', 'Trabzon', 'Eskişehir', 'Diğer',
];

interface FormState {
  title:               string;
  short_description:   string;
  description:         string;
  category:            string;
  required_skills:     string[];
  city:                string;
  address:             string;
  meeting_point:       string;
  event_date:          string;
  event_time:          string;
  end_time:            string;
  max_participants:    string;
  verification_method: 'qr' | 'code' | 'none';
  contact_info:        string;
  preparation_notes:   string;
  cover_photo_url:     string;
  coverFile:           File | null;
  coverPreview:        string;
}

const EventEdit = () => {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [event,     setEvent]     = useState<Event | null>(null);
  const [form,      setForm]      = useState<FormState | null>(null);

  // ─── Etkinliği yükle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    eventsApi.get(id).then(r => {
      const ev = r.data;
      setEvent(ev);

      // Tarih ve saati parçala
      const dt       = ev.event_date ? new Date(ev.event_date) : null;
      const endDt    = ev.end_time   ? new Date(ev.end_time)   : null;
      const dateStr  = dt    ? dt.toISOString().slice(0, 10)     : '';
      const timeStr  = dt    ? dt.toISOString().slice(11, 16)    : '10:00';
      const endStr   = endDt ? endDt.toISOString().slice(11, 16) : '';

      setForm({
        title:               ev.title            ?? '',
        short_description:   ev.short_description ?? '',
        description:         ev.description       ?? '',
        category:            ev.category          ?? '',
        required_skills:     ev.required_skills   ?? [],
        city:                ev.city              ?? '',
        address:             ev.address           ?? '',
        meeting_point:       ev.meeting_point     ?? '',
        event_date:          dateStr,
        event_time:          timeStr,
        end_time:            endStr,
        max_participants:    ev.max_participants ? String(ev.max_participants) : '',
        verification_method: (ev.verification_method as any) ?? 'code',
        contact_info:        (ev as any).contact_info    ?? '',
        preparation_notes:   (ev as any).preparation_notes ?? '',
        cover_photo_url:     ev.cover_photo_url  ?? '',
        coverFile:           null,
        coverPreview:        '',
      });
    }).catch(() => {
      toast.error('Etkinlik yüklenemedi');
      navigate('/discover');
    }).finally(() => setLoading(false));
  }, [id]);

  // ─── Yetki kontrolü ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!event || !user || loading) return;
    const isCreator = event.is_creator || event.creator_id === user.id;
    if (!isCreator) {
      toast.error('Bu etkinliği düzenleme yetkiniz yok');
      navigate(`/events/${id}`);
    }
  }, [event, user, loading]);

  if (loading || !form) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upd = (key: keyof FormState, value: unknown) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev);

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upd('coverFile',    file);
    upd('coverPreview', URL.createObjectURL(file));
  };

  // ─── Kaydet ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim())  { toast.error('Etkinlik adı zorunlu'); return; }
    if (!form.event_date)    { toast.error('Tarih seçimi zorunlu'); return; }
    if (!form.city)          { toast.error('Şehir seçimi zorunlu'); return; }

    setSaving(true);
    try {
      const payload = {
        title:               form.title,
        short_description:   form.short_description,
        description:         form.description,
        category:            form.category,
        city:                form.city,
        address:             form.address   || undefined,
        meeting_point:       form.meeting_point || undefined,
        event_date:          `${form.event_date}T${form.event_time}:00`,
        end_time:            form.end_time ? `${form.event_date}T${form.end_time}:00` : undefined,
        max_participants:    form.max_participants ? parseInt(form.max_participants) : undefined,
        required_skills:     form.required_skills,
        preparation_notes:   form.preparation_notes || undefined,
        contact_info:        form.contact_info || undefined,
        verification_method: form.verification_method,
        cover_photo_url:     form.cover_photo_url.trim() || undefined,
      };

      await eventsApi.update(id!, payload as any);

      // Kapak fotoğrafı dosyası seçilmişse yükle
      if (form.coverFile) {
        const fd = new FormData();
        fd.append('file', form.coverFile);
        await api.post(`/events/${id}/cover`, fd).catch(() => {});
      }

      toast.success('Etkinlik güncellendi!');
      navigate(`/events/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  };

  // ─── Sil ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Etkinliği silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setDeleting(true);
    try {
      await eventsApi.delete(id!);
      toast.success('Etkinlik silindi');
      navigate('/discover');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Silme başarısız');
    } finally {
      setDeleting(false);
    }
  };

  const coverSrc = form.coverPreview || form.cover_photo_url;

  return (
    <div className="min-h-screen pt-20 pb-16 bg-earth-lighter">
      <div className="max-w-2xl mx-auto px-4">

        {/* Başlık */}
        <div className="flex items-center gap-3 mb-6 pt-4">
          <Link to={`/events/${id}`} className="flex items-center gap-1.5 text-sm text-text-soft hover:text-text transition-colors">
            <ChevronLeft size={18} />
            Etkinliğe Dön
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-text">Etkinliği Düzenle</h1>
          <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
            <Trash2 size={14} />
            Sil
          </Button>
        </div>

        <div className="space-y-6">

          {/* ── Temel Bilgiler ─────────────────────────────────────────── */}
          <div className="card space-y-5">
            <h2 className="font-semibold text-lg text-text">Temel Bilgiler</h2>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Etkinlik Adı</label>
              <input
                type="text" maxLength={80}
                value={form.title}
                onChange={e => upd('title', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Kısa Açıklama</label>
              <input
                type="text" maxLength={160}
                value={form.short_description}
                onChange={e => upd('short_description', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Detaylı Açıklama</label>
              <textarea
                rows={5}
                value={form.description}
                onChange={e => upd('description', e.target.value)}
                className="input resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Kategori</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <Chip
                    key={cat}
                    label={`${categoryEmoji[cat]} ${cat}`}
                    active={form.category === cat}
                    onClick={() => upd('category', form.category === cat ? '' : cat)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Gerekli Yetenekler <span className="text-text-muted font-normal">(opsiyonel)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(skill => (
                  <Chip
                    key={skill}
                    label={skill}
                    active={form.required_skills.includes(skill)}
                    onClick={() => upd('required_skills',
                      form.required_skills.includes(skill)
                        ? form.required_skills.filter(s => s !== skill)
                        : [...form.required_skills, skill]
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Lojistik ──────────────────────────────────────────────── */}
          <div className="card space-y-5">
            <h2 className="font-semibold text-lg text-text">Tarih ve Konum</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Tarih</label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={e => upd('event_date', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Saat</label>
                <input
                  type="time"
                  value={form.event_time}
                  onChange={e => upd('event_time', e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Bitiş Saati <span className="text-text-muted font-normal">(opsiyonel)</span>
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => upd('end_time', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Şehir</label>
              <select
                value={form.city}
                onChange={e => upd('city', e.target.value)}
                className="input"
              >
                <option value="">Şehir seç...</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Adres</label>
              <input
                type="text"
                value={form.address}
                onChange={e => upd('address', e.target.value)}
                placeholder="Cadde, mahalle veya mekan adı"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Buluşma Noktası</label>
              <input
                type="text"
                value={form.meeting_point}
                onChange={e => upd('meeting_point', e.target.value)}
                placeholder="Örn: Ana giriş, otopark kapısı"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Maksimum Katılımcı <span className="text-text-muted font-normal">(opsiyonel)</span>
              </label>
              <input
                type="number" min={1}
                value={form.max_participants}
                onChange={e => upd('max_participants', e.target.value)}
                placeholder="Sınırsız"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                İletişim Bilgisi <span className="text-text-muted font-normal">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={form.contact_info}
                onChange={e => upd('contact_info', e.target.value)}
                placeholder="E-posta veya telefon"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Varlık Doğrulama</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'code', label: '6 Haneli Kod', desc: 'Katılımcılar kod girer' },
                  { value: 'qr',   label: 'QR Kod',       desc: 'QR okutma ile' },
                  { value: 'none', label: 'Yok',          desc: 'Doğrulama olmadan' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => upd('verification_method', opt.value)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      form.verification_method === opt.value
                        ? 'border-primary bg-primary-light'
                        : 'border-earth-lighter hover:border-earth-light'
                    )}
                  >
                    <div className="font-semibold text-sm text-text">{opt.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Medya ─────────────────────────────────────────────────── */}
          <div className="card space-y-5">
            <h2 className="font-semibold text-lg text-text">Kapak Fotoğrafı</h2>

            {coverSrc ? (
              <div className="relative rounded-xl overflow-hidden h-48">
                <img src={coverSrc} alt="" className="w-full h-full object-cover"
                  onError={e => (e.currentTarget.style.display = 'none')} />
                <button
                  type="button"
                  onClick={() => { upd('coverFile', null); upd('coverPreview', ''); upd('cover_photo_url', ''); }}
                  className="absolute top-3 right-3 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-3 left-3 bg-primary text-white text-xs px-3 py-1 rounded-chip">
                  ✓ Kapak fotoğrafı
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-earth-light rounded-xl bg-earth-lighter hover:bg-primary-light hover:border-primary cursor-pointer transition-all">
                  <Upload size={22} className="text-earth-light mb-2" />
                  <span className="text-sm font-medium text-text-soft">Bilgisayardan seç</span>
                  <span className="text-xs text-text-muted mt-1">JPG, PNG, WebP · Max 10MB</span>
                  <input type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-earth-lighter" />
                  <span className="text-xs text-text-muted">veya URL ile ekle</span>
                  <div className="flex-1 h-px bg-earth-lighter" />
                </div>
                <div className="relative">
                  <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="https://... fotoğraf URL'ini yapıştır"
                    value={form.cover_photo_url}
                    onChange={e => { upd('cover_photo_url', e.target.value); upd('coverFile', null); upd('coverPreview', ''); }}
                    className="input w-full pl-9 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Ön Hazırlık Notu <span className="text-text-muted font-normal">(opsiyonel)</span>
              </label>
              <textarea
                rows={3}
                value={form.preparation_notes}
                onChange={e => upd('preparation_notes', e.target.value)}
                placeholder="Katılımcıların ne getirmesi gerektiğini yaz..."
                className="input resize-none"
              />
            </div>
          </div>

          {/* ── Kaydet butonu ─────────────────────────────────────────── */}
          <div className="flex gap-3 justify-end pb-4">
            <Button type="button" variant="outline" onClick={() => navigate(`/events/${id}`)}>
              İptal
            </Button>
            <Button type="button" loading={saving} onClick={handleSave}>
              <Save size={16} />
              Değişiklikleri Kaydet
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EventEdit;
