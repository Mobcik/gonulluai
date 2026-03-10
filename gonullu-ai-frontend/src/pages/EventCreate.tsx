import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Check, Upload, X,
  Link as LinkIcon, Sparkles, MapPin, Clock, Calendar,
} from 'lucide-react';
import { eventsApi, type CreateEventPayload } from '../api/events';
import api from '../api/client';
import type { EventCategory } from '../types';
import Chip from '../components/common/Chip';
import Button from '../components/common/Button';
import { categoryEmoji } from '../utils/formatPoints';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

const CATEGORIES: EventCategory[] = [
  'Çevre', 'Eğitim', 'Sağlık', 'Hayvan Hakları',
  'Yaşlı Bakımı', 'Çocuk Gelişimi', 'Teknoloji', 'Sanat & Kültür',
];
const SKILLS = [
  'İletişim', 'Liderlik', 'Yazılım', 'Tasarım', 'Öğretmenlik',
  'Tıp / Sağlık', 'Fotoğrafçılık', 'Müzik', 'Tercüme',
  'Araç Kullanımı', 'Sosyal Medya', 'Muhasebe', 'Hukuk',
];
const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana',
  'Konya', 'Gaziantep', 'Kayseri', 'Mersin', 'Samsun', 'Trabzon', 'Eskişehir', 'Diğer',
];

// Adım 0 → konum/zaman | Adım 1 → içerik + AI | Adım 2 → detaylar | Adım 3 → medya
const STEPS = ['Konum & Zaman', 'İçerik', 'Detaylar', 'Medya & Yayın'];

interface FormState {
  // Adım 0
  title:               string;
  category:            string;
  city:                string;
  address:             string;
  meeting_point:       string;
  event_date:          string;
  event_time:          string;
  end_time:            string;
  // Adım 1
  short_description:   string;
  description:         string;
  required_skills:     string[];
  // Adım 2
  max_participants:    string;
  verification_method: 'qr' | 'code' | 'none';
  contact_info:        string;
  preparation_notes:   string;
  // Adım 3
  coverFile:           File | null;
  coverPreview:        string;
  coverUrl:            string;
  publishNow:          boolean;
}

const INIT: FormState = {
  title: '', category: '', city: '', address: '', meeting_point: '',
  event_date: '', event_time: '10:00', end_time: '',
  short_description: '', description: '', required_skills: [],
  max_participants: '', verification_method: 'code',
  contact_info: '', preparation_notes: '',
  coverFile: null, coverPreview: '', coverUrl: '', publishNow: true,
};

const EventCreate = () => {
  const navigate            = useNavigate();
  const [step, setStep]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm]     = useState<FormState>(INIT);

  const upd = (key: keyof FormState, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── AI ile Doldur — Adım 0 verilerini de gönderir ─────────────────────────
  const handleAiGenerate = async () => {
    if (!form.title.trim()) {
      toast.error('Önce etkinlik adı gir');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await eventsApi.generateDescription(
        form.title,
        form.category || 'Genel',
        form.city || 'Türkiye',
        // Adım 0'dan toplanan bağlam: adres + saat AI'a geçiyor
        [
          form.address && `Adres: ${form.address}`,
          form.meeting_point && `Buluşma: ${form.meeting_point}`,
          form.event_time && `Saat: ${form.event_time}`,
          form.end_time && `Bitiş: ${form.end_time}`,
          form.event_date && `Tarih: ${form.event_date}`,
        ].filter(Boolean).join(' | '),
      );
      if (data.short_description) upd('short_description', data.short_description);
      if (data.description)       upd('description', data.description);
      toast.success('AI açıklama oluşturdu! Düzenleyebilirsin ✨');
    } catch {
      toast.error('AI şu an kullanılamıyor, tekrar dene');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upd('coverFile', file);
    upd('coverPreview', URL.createObjectURL(file));
  };

  // ── Adım doğrulama ────────────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.title.trim())    return 'Etkinlik adı zorunlu';
      if (!form.category)        return 'Kategori seçimi zorunlu';
      if (!form.event_date)      return 'Tarih seçimi zorunlu';
      if (!form.city)            return 'Şehir seçimi zorunlu';
    }
    if (s === 1) {
      if (!form.short_description.trim()) return 'Kısa açıklama zorunlu';
      if (!form.description.trim())       return 'Detaylı açıklama zorunlu';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ── Adım 0 tamamlandı mı? (AI butonunu aktif etmek için) ─────────────────
  const step0Done = !!(form.title.trim() && form.category && form.city);

  return (
    <div className="min-h-screen pt-20 pb-16 bg-earth-lighter">
      <div className="max-w-2xl mx-auto px-4">

        {/* Başlık */}
        <div className="text-center mb-8 pt-6">
          <h1 className="font-display text-3xl font-bold text-text">Etkinlik Oluştur</h1>
          <p className="text-text-muted mt-1">+50 puan kazanmak için etkinliğini oluştur</p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                i < step   ? 'bg-primary text-white' :
                i === step ? 'bg-primary text-white shadow-green' :
                             'bg-earth-lighter border-2 border-earth-light text-text-muted'
              )}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:block',
                i === step ? 'text-primary' : 'text-text-muted'
              )}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('w-6 h-0.5 mx-1', i < step ? 'bg-primary' : 'bg-earth-lighter')} />
              )}
            </div>
          ))}
        </div>

        {/* İçerik kartı */}
        <div className="card shadow-card-hover animate-fadeIn">

          {/* ── ADIM 0 ─ Konum & Zaman ──────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-lg text-text">Konum & Zaman</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Bu bilgiler AI'ın daha iyi açıklama yazması için kullanılır
                </p>
              </div>

              {/* Başlık + Kategori */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Etkinlik Adı <span className="text-red-400">*</span>
                  <span className="text-text-muted text-xs font-normal ml-1">({form.title.length}/80)</span>
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
                <label className="block text-sm font-medium text-text mb-2">
                  Kategori <span className="text-red-400">*</span>
                </label>
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

              {/* Tarih + Saat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-text mb-1.5">
                    <Calendar size={13} className="text-primary" />
                    Tarih <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.event_date}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    onChange={e => upd('event_date', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-text mb-1.5">
                    <Clock size={13} className="text-primary" />
                    Başlangıç Saati
                  </label>
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
                  Bitiş Saati
                  <span className="text-text-muted font-normal text-xs ml-1">(opsiyonel)</span>
                </label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={e => upd('end_time', e.target.value)}
                  className="input"
                />
              </div>

              {/* Konum */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Şehir <span className="text-red-400">*</span>
                </label>
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
                <label className="flex items-center gap-1.5 text-sm font-medium text-text mb-1.5">
                  <MapPin size={13} className="text-primary" />
                  Adres
                  <span className="text-text-muted font-normal text-xs">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => upd('address', e.target.value)}
                  placeholder="Cadde, mahalle veya mekan adı"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Buluşma Noktası
                  <span className="text-text-muted font-normal text-xs ml-1">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={form.meeting_point}
                  onChange={e => upd('meeting_point', e.target.value)}
                  placeholder="Örn: Ana giriş kapısı, otopark girişi"
                  className="input"
                />
              </div>

              {/* Özet kutusu — ne seçildiğini göster */}
              {(form.city || form.address || form.event_date) && (
                <div className="bg-primary-light rounded-xl p-4 text-sm space-y-1.5">
                  <p className="font-semibold text-primary text-xs uppercase tracking-wide mb-2">
                    Etkinlik Özeti
                  </p>
                  {form.event_date && (
                    <div className="flex items-center gap-2 text-text-soft">
                      <Calendar size={13} className="text-primary flex-shrink-0" />
                      {form.event_date} · {form.event_time}
                      {form.end_time && ` – ${form.end_time}`}
                    </div>
                  )}
                  {form.city && (
                    <div className="flex items-center gap-2 text-text-soft">
                      <MapPin size={13} className="text-primary flex-shrink-0" />
                      {form.city}{form.address && `, ${form.address}`}
                    </div>
                  )}
                  {form.meeting_point && (
                    <div className="flex items-center gap-2 text-text-soft">
                      <span className="text-primary">📍</span>
                      {form.meeting_point}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ADIM 1 ─ İçerik + AI ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg text-text">Etkinlik İçeriği</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Konum ve zaman bilgileriyle kişiselleştirilmiş açıklama üret
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiLoading || !step0Done}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border',
                    step0Done
                      ? 'bg-primary text-white border-primary shadow-green hover:bg-primary-dark hover:-translate-y-0.5'
                      : 'bg-earth-lighter text-text-muted border-earth-light cursor-not-allowed'
                  )}
                  title={step0Done ? 'Konum ve zaman bilgileriyle AI açıklama üretir' : 'Adım 1\'de başlık, kategori ve şehir gerekli'}
                >
                  {aiLoading
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Sparkles size={12} />
                  }
                  {aiLoading ? 'AI yazıyor…' : 'AI ile Doldur'}
                </button>
              </div>

              {/* AI bağlam özeti — ne bildiğini göster */}
              {step0Done && (
                <div className="bg-earth-lighter rounded-xl px-4 py-3 text-xs text-text-muted flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-semibold text-primary">AI bilgileri:</span>
                  {form.category && <span>{categoryEmoji[form.category as EventCategory]} {form.category}</span>}
                  {form.city     && <span>📍 {form.city}{form.address && `, ${form.address}`}</span>}
                  {form.event_date && <span>📅 {form.event_date} {form.event_time}</span>}
                  {form.meeting_point && <span>🚩 {form.meeting_point}</span>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Kısa Açıklama <span className="text-red-400">*</span>
                  <span className="text-text-muted text-xs font-normal ml-1">({form.short_description.length}/160)</span>
                </label>
                <input
                  type="text" maxLength={160}
                  value={form.short_description}
                  onChange={e => upd('short_description', e.target.value)}
                  placeholder="Kart üzerinde görünecek kısa tanım — veya AI ile oluştur"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Detaylı Açıklama <span className="text-red-400">*</span>
                  <span className="text-text-muted text-xs font-normal ml-1">({form.description.length} karakter)</span>
                </label>
                <textarea
                  rows={7}
                  value={form.description}
                  onChange={e => upd('description', e.target.value)}
                  placeholder="Etkinlik detaylarını, amacını ve katılım bilgilerini anlat… veya AI ile oluştur"
                  className="input resize-none"
                />
                {form.description && (
                  <p className="text-xs text-text-muted mt-1">
                    ✏️ İstediğin gibi düzenleyebilirsin
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Gerekli Yetenekler
                  <span className="text-text-muted font-normal text-xs ml-1">(opsiyonel)</span>
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

          {/* ── ADIM 2 ─ Detaylar ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg text-text">Etkinlik Detayları</h2>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Maksimum Katılımcı
                  <span className="text-text-muted font-normal text-xs ml-1">(opsiyonel — boş = sınırsız)</span>
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
                <label className="block text-sm font-medium text-text mb-2">Katılım Doğrulama</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'code', label: '6 Haneli Kod',  desc: 'Organizatör kodu paylaşır',   emoji: '🔢' },
                    { value: 'qr',   label: 'QR Kod',        desc: 'Telefonla QR okutma',         emoji: '📱' },
                    { value: 'none', label: 'Doğrulamasız',  desc: 'Açık katılım',                emoji: '🔓' },
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
                      <div className="text-lg mb-1">{opt.emoji}</div>
                      <div className="font-semibold text-sm text-text">{opt.label}</div>
                      <div className="text-xs text-text-muted mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Ön Hazırlık Notu
                  <span className="text-text-muted font-normal text-xs ml-1">(opsiyonel)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.preparation_notes}
                  onChange={e => upd('preparation_notes', e.target.value)}
                  placeholder="Katılımcıların ne getirmesi gerektiğini yaz…"
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  İletişim Bilgisi
                  <span className="text-text-muted font-normal text-xs ml-1">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={form.contact_info}
                  onChange={e => upd('contact_info', e.target.value)}
                  placeholder="E-posta veya telefon numarası"
                  className="input"
                />
              </div>

              {/* Puan özeti */}
              <div className="p-4 bg-primary-light rounded-xl">
                <h3 className="font-semibold text-primary text-sm mb-2">Etkinlik Oluştururken Kazanacakların</h3>
                <div className="space-y-1 text-xs text-text-soft">
                  <div className="flex justify-between"><span>Etkinlik oluşturma</span><span className="font-bold text-primary">+50 puan</span></div>
                  <div className="flex justify-between"><span>Her katılımcı tamamladığında</span><span className="font-bold text-primary">+25 bonus</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── ADIM 3 ─ Medya & Yayın ──────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-lg text-text">Medya & Yayın</h2>

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

              {/* Yayın durumu */}
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

              {/* Özet — yayınlamadan önce kontrol */}
              <div className="bg-white border border-earth-lighter rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-text text-xs uppercase tracking-wide mb-3">Özet</p>
                <div className="flex justify-between text-text-soft"><span>Etkinlik</span><span className="text-text font-medium truncate max-w-[200px]">{form.title}</span></div>
                <div className="flex justify-between text-text-soft"><span>Kategori</span><span className="text-text">{form.category}</span></div>
                <div className="flex justify-between text-text-soft"><span>Tarih</span><span className="text-text">{form.event_date} {form.event_time}</span></div>
                <div className="flex justify-between text-text-soft"><span>Şehir</span><span className="text-text">{form.city}</span></div>
                {form.address && <div className="flex justify-between text-text-soft"><span>Adres</span><span className="text-text truncate max-w-[200px]">{form.address}</span></div>}
                {form.meeting_point && <div className="flex justify-between text-text-soft"><span>Buluşma</span><span className="text-text truncate max-w-[200px]">{form.meeting_point}</span></div>}
              </div>
            </div>
          )}

          {/* ── Gezinme butonları ─────────────────────────────────────── */}
          <div className={cn('flex mt-8 pt-6 border-t border-earth-lighter', step > 0 ? 'justify-between' : 'justify-end')}>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <ChevronLeft size={16} /> Geri
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                İleri <ChevronRight size={16} />
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
