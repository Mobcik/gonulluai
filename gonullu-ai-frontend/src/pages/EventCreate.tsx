import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Upload, X, Link as LinkIcon } from 'lucide-react';
import { eventsApi, type CreateEventPayload } from '../api/events';
import api from '../api/client';
import type { EventCategory } from '../types';
import Chip from '../components/common/Chip';
import Button from '../components/common/Button';
import { categoryEmoji } from '../utils/formatPoints';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const CATEGORIES: EventCategory[] = ['Çevre', 'Eğitim', 'Sağlık', 'Hayvan Hakları', 'Yaşlı Bakımı', 'Çocuk Gelişimi', 'Teknoloji', 'Sanat & Kültür'];
const SKILLS = ['İletişim', 'Organizasyon', 'Eğitim', 'Teknik', 'Sağlık', 'Fiziksel Aktivite', 'Sanat', 'Teknoloji', 'Yabancı Dil', 'Sürücü Belgesi'];
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Mersin', 'Samsun', 'Trabzon', 'Eskişehir', 'Diğer'];
const STEPS = ['Temel Bilgiler', 'Lojistik', 'Medya ve Yayın'];

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
  coverFile:           File | null;
  coverPreview:        string;
  coverUrl:            string;
  publishNow:          boolean;
}

const INIT: FormState = {
  title: '', short_description: '', description: '', category: '',
  required_skills: [], city: '', address: '', meeting_point: '',
  event_date: '', event_time: '10:00', end_time: '', max_participants: '',
  verification_method: 'code', contact_info: '', preparation_notes: '',
  coverFile: null, coverPreview: '', coverUrl: '', publishNow: true,
};

const EventCreate = () => {
  const navigate       = useNavigate();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState<FormState>(INIT);

  const upd = (key: keyof FormState, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upd('coverFile', file);
    upd('coverPreview', URL.createObjectURL(file));
  };

  // ─── adım doğrulama ────────────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.title.trim())               return 'Etkinlik adı zorunlu';
      if (!form.short_description.trim())   return 'Kısa açıklama zorunlu';
      if (!form.description.trim())         return 'Detaylı açıklama zorunlu';
      if (!form.category)                   return 'Kategori seçimi zorunlu';
    }
    if (s === 1) {
      if (!form.event_date)   return 'Tarih seçimi zorunlu';
      if (!form.city)         return 'Şehir seçimi zorunlu';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: CreateEventPayload = {
        title:               form.title,
        short_description:   form.short_description,
        description:         form.description,
        category:            form.category,
        city:                form.city,
        address:             form.address || undefined,
        meeting_point:       form.meeting_point || undefined,
        event_date:          `${form.event_date}T${form.event_time}:00`,
        end_time:            form.end_time ? `${form.event_date}T${form.end_time}:00` : undefined,
        max_participants:    form.max_participants ? parseInt(form.max_participants) : undefined,
        required_skills:     form.required_skills,
        preparation_notes:   form.preparation_notes || undefined,
        contact_info:        form.contact_info || undefined,
        verification_method: form.verification_method,
        cover_photo_url:     form.coverUrl.trim() || undefined,
      };

      const { data } = await eventsApi.create(payload);
      const eventId  = data.id;

      if (form.coverFile) {
        try {
          const fd = new FormData();
          fd.append('file', form.coverFile);
          await api.post(`/events/${eventId}/cover`, fd);
          toast.success('Etkinlik oluşturuldu! Kapak fotoğrafı eklendi 🎉 +50 puan');
        } catch {
          toast.success('Etkinlik oluşturuldu! +50 puan 🎉');
        }
      } else {
        toast.success('Etkinlik oluşturuldu! +50 puan 🎉');
      }

      navigate(`/events/${eventId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Etkinlik oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-earth-lighter">
      <div className="max-w-2xl mx-auto px-4">

        {/* Başlık */}
        <div className="text-center mb-8 pt-6">
          <h1 className="font-display text-3xl font-bold text-text">Etkinlik Oluştur</h1>
          <p className="text-text-muted mt-1">+50 puan kazanmak için etkinliğini oluştur</p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                i < step   ? 'bg-primary text-white' :
                i === step ? 'bg-primary text-white shadow-green' :
                             'bg-earth-lighter border-2 border-earth-light text-text-muted'
              )}>
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              <span className={cn('text-sm font-medium hidden sm:block', i === step ? 'text-primary' : 'text-text-muted')}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('w-8 h-0.5 mx-1', i < step ? 'bg-primary' : 'bg-earth-lighter')} />
              )}
            </div>
          ))}
        </div>

        {/* İçerik kartı */}
        <div className="card shadow-card-hover animate-fadeIn">

          {/* ── ADIM 0 ─ Temel Bilgiler ──────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg text-text">Temel Bilgiler</h2>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Etkinlik Adı <span className="text-text-muted text-xs">({form.title.length}/80)</span>
                </label>
                <input
                  type="text" maxLength={80}
                  value={form.title}
                  onChange={e => upd('title', e.target.value)}
                  placeholder="Örn: Belgrad Ormanı Ağaç Dikme Etkinliği"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Kısa Açıklama <span className="text-text-muted text-xs">({form.short_description.length}/160)</span>
                </label>
                <input
                  type="text" maxLength={160}
                  value={form.short_description}
                  onChange={e => upd('short_description', e.target.value)}
                  placeholder="Kart üzerinde görünecek kısa tanım"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Detaylı Açıklama <span className="text-text-muted text-xs">({form.description.length} karakter)</span>
                </label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={e => upd('description', e.target.value)}
                  placeholder="Etkinlik detaylarını, amacını ve nasıl katılabileceğini anlat..."
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
          )}

          {/* ── ADIM 1 ─ Lojistik ───────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg text-text">Lojistik Bilgiler</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Tarih</label>
                  <input
                    type="date"
                    value={form.event_date}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    onChange={e => upd('event_date', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Başlangıç Saati</label>
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
                <label className="block text-sm font-medium text-text mb-2">Varlık Doğrulama Yöntemi</label>
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
            </div>
          )}

          {/* ── ADIM 2 ─ Medya ve Yayın ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg text-text">Medya ve Yayın</h2>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Kapak Fotoğrafı
                  <span className="text-text-muted font-normal text-xs ml-1">(opsiyonel)</span>
                </label>

                {(form.coverPreview || form.coverUrl) ? (
                  <div className="relative rounded-xl overflow-hidden h-48 mb-3">
                    <img
                      src={form.coverPreview || form.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                    <button
                      type="button"
                      onClick={() => { upd('coverFile', null); upd('coverPreview', ''); upd('coverUrl', ''); }}
                      className="absolute top-3 right-3 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-3 left-3 bg-primary text-white text-xs px-3 py-1 rounded-chip">
                      ✓ Fotoğraf hazır
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-earth-light rounded-xl bg-earth-lighter hover:bg-primary-light hover:border-primary cursor-pointer transition-all">
                      <Upload size={24} className="text-earth-light mb-2" />
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
                        value={form.coverUrl}
                        onChange={e => { upd('coverUrl', e.target.value); upd('coverFile', null); upd('coverPreview', ''); }}
                        className="input w-full pl-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

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

              <div className="p-4 bg-primary-light rounded-xl">
                <h3 className="font-semibold text-primary text-sm mb-2">Etkinlik Oluştururken Kazanacakların</h3>
                <div className="space-y-1 text-xs text-text-soft">
                  <div className="flex justify-between"><span>Etkinlik oluşturma</span><span className="font-bold text-primary">+50 puan</span></div>
                  <div className="flex justify-between"><span>Her katılımcı tamamladığında</span><span className="font-bold text-primary">+25 puan</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-earth-lighter rounded-xl">
                <div>
                  <div className="font-medium text-text text-sm">Hemen Yayınla</div>
                  <div className="text-xs text-text-muted">Kapalıysa taslak olarak kaydedilir</div>
                </div>
                <button
                  type="button"
                  onClick={() => upd('publishNow', !form.publishNow)}
                  className={cn('w-12 h-6 rounded-full transition-all relative', form.publishNow ? 'bg-primary' : 'bg-earth-light')}
                >
                  <div className={cn('w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all', form.publishNow ? 'right-0.5' : 'left-0.5')} />
                </button>
              </div>
            </div>
          )}

          {/* ── Gezinme butonları ─────────────────────────────────────────── */}
          <div className={cn('flex mt-8 pt-6 border-t border-earth-lighter', step > 0 ? 'justify-between' : 'justify-end')}>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} />
                Geri
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                İleri
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button type="button" loading={loading} onClick={handleSubmit}>
                {form.publishNow ? 'Etkinliği Yayınla 🚀' : 'Taslak Olarak Kaydet'}
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default EventCreate;
