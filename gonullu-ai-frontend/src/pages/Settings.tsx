import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, User, MapPin, BookOpen, Wrench, Camera, ArrowLeft, Upload, Bell, Download, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import Avatar from '../components/common/Avatar';
import { cn } from '../utils/cn';

const TURKISH_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
  'Gaziantep', 'Şanlıurfa', 'Kocaeli', 'Mersin', 'Diyarbakır', 'Hatay',
  'Manisa', 'Kayseri', 'Samsun', 'Balıkesir', 'Kahramanmaraş', 'Van',
  'Denizli', 'Eskişehir', 'Trabzon', 'Malatya', 'Erzurum', 'Rize',
];

const INTEREST_OPTIONS = [
  'Çevre', 'Eğitim', 'Sağlık', 'Hayvan Hakları',
  'Yaşlı Bakımı', 'Çocuk Gelişimi', 'Teknoloji', 'Sanat & Kültür',
];

const SKILL_OPTIONS = [
  'İletişim', 'Liderlik', 'Yazılım', 'Tasarım', 'Muhasebe', 'Hukuk',
  'Tıp / Sağlık', 'Öğretmenlik', 'Sosyal Medya', 'Fotoğrafçılık',
  'Tercüme', 'Müzik', 'Spor Antrenörlüğü', 'Psikoloji', 'Araç Kullanımı',
];

const Settings = () => {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate             = useNavigate();

  const [fullName,    setFullName]    = useState(user?.full_name || '');
  const [bio,         setBio]         = useState(user?.bio || '');
  const [city,        setCity]        = useState(user?.city || '');
  const [avatarUrl,   setAvatarUrl]   = useState(user?.avatar_url || '');
  const [isStudent,   setIsStudent]   = useState(user?.is_student || false);
  const [university,  setUniversity]  = useState(user?.university_name || '');
  const [interests,   setInterests]   = useState<string[]>(user?.interests || []);
  const [skills,      setSkills]      = useState<string[]>(user?.skills || []);
  const [emailReminders, setEmailReminders] = useState(user?.email_event_reminders !== false);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(user?.email_weekly_digest === true);
  const [saving,      setSaving]      = useState(false);
  const [avatarFile,  setAvatarFile]  = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    setEmailReminders(user.email_event_reminders !== false);
    setEmailWeeklyDigest(user.email_weekly_digest === true);
  }, [user]);

  if (authLoading) return null;
  if (!user) return null;

  const toggleItem = (
    list: string[], setter: (v: string[]) => void, item: string
  ) => {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUrl('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl.trim() || null;

      // Dosya seçildiyse önce yükle
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const { data: uploadData } = await api.post('/users/me/avatar', fd);
        finalAvatarUrl = uploadData.avatar_url;
      }

      const { data } = await api.put('/users/me', {
        full_name:       fullName.trim(),
        bio:             bio.trim() || null,
        city:            city || null,
        avatar_url:      finalAvatarUrl,
        is_student:      isStudent,
        university_name: isStudent ? university.trim() || null : null,
        interests,
        skills,
        email_event_reminders: emailReminders,
        email_weekly_digest: emailWeeklyDigest,
      });
      updateUser(data);
      toast.success('Profil güncellendi!');
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-white hover:shadow-card transition-all text-text-soft hover:text-text"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-2xl font-bold text-text">Profili Düzenle</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar önizleme */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
              <Camera size={15} className="text-primary" /> Profil Fotoğrafı
            </h2>
            <div className="flex items-start gap-4">
              {/* Tıklanabilir avatar — dosya seçer */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group flex-shrink-0"
                title="Fotoğraf yükle"
              >
                <Avatar
                  src={avatarPreview || avatarUrl || user.avatar_url}
                  name={fullName || user.full_name}
                  size="lg"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={18} className="text-white" />
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              <div className="flex-1 space-y-2">
                {/* Dosya yükle butonu */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors w-full justify-center"
                >
                  <Upload size={14} />
                  {avatarFile ? avatarFile.name : 'Bilgisayardan fotoğraf seç'}
                </button>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="flex-1 h-px bg-earth-light/50" />
                  <span>veya URL yapıştır</span>
                  <span className="flex-1 h-px bg-earth-light/50" />
                </div>

                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => { setAvatarUrl(e.target.value); setAvatarFile(null); setAvatarPreview(null); }}
                  placeholder="https://... fotoğraf URL'i"
                  className="input w-full text-sm"
                />
              </div>
            </div>
          </div>

          {/* Temel bilgiler */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
              <User size={15} className="text-primary" /> Temel Bilgiler
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-1.5">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="input w-full"
                  placeholder="Adın ve soyadın"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-1.5">
                  Hakkında
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  className="input w-full resize-none"
                  placeholder="Kendini kısaca tanıt..."
                  maxLength={300}
                />
                <p className="text-xs text-text-muted mt-1 text-right">{bio.length}/300</p>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-earth-lighter/60 border border-earth-lighter">
                <Bell size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailReminders}
                      onChange={e => setEmailReminders(e.target.checked)}
                      className="rounded border-earth-light text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-text">Etkinlik hatırlatıcı e-postaları</span>
                  </label>
                  <p className="text-xs text-text-muted mt-1.5 pl-7">
                    Kayıtlı olduğun etkinlikler için yaklaşık 24 saat ve 1 saat önce hatırlatma (SMTP açıksa).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-earth-lighter/60 border border-earth-lighter">
                <Calendar size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailWeeklyDigest}
                      onChange={e => setEmailWeeklyDigest(e.target.checked)}
                      className="rounded border-earth-light text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-text">Haftalık özet e-postası</span>
                  </label>
                  <p className="text-xs text-text-muted mt-1.5 pl-7">
                    Pazartesi sabahı (İstanbul saati) yaklaşan etkinlik özeti; SMTP ve tercih açıksa gönderilir.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-1.5">
                  <MapPin size={11} className="inline mr-1" />Şehir
                </label>
                <select value={city} onChange={e => setCity(e.target.value)} className="input w-full">
                  <option value="">Şehir seç</option>
                  {TURKISH_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setIsStudent(s => !s)}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      isStudent ? 'bg-primary' : 'bg-earth-lighter'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
                      isStudent ? 'left-5' : 'left-1'
                    )} />
                  </div>
                  <span className="text-sm font-medium text-text">Öğrenciyim 🎓</span>
                </label>
                {isStudent && (
                  <input
                    type="text"
                    value={university}
                    onChange={e => setUniversity(e.target.value)}
                    placeholder="Üniversite adı"
                    className="input w-full mt-3"
                  />
                )}
              </div>
            </div>
          </div>

          {/* İlgi alanları */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-1 flex items-center gap-2">
              <BookOpen size={15} className="text-primary" /> İlgi Alanlarım
            </h2>
            <p className="text-xs text-text-muted mb-4">
              Seçtiklerine göre sana uygun etkinlikler önerilir
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(interests, setInterests, item)}
                  className={cn(
                    'chip text-sm transition-all',
                    interests.includes(item)
                      ? 'chip-active shadow-green'
                      : 'chip-inactive'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Yetenekler */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-1 flex items-center gap-2">
              <Wrench size={15} className="text-primary" /> Yeteneklerim
            </h2>
            <p className="text-xs text-text-muted mb-4">
              Etkinlik düzenleyicileri seni daha kolay bulabilir
            </p>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(skills, setSkills, item)}
                  className={cn(
                    'chip text-sm transition-all',
                    skills.includes(item)
                      ? 'chip-active shadow-green'
                      : 'chip-inactive'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-1 flex items-center gap-2">
              <Calendar size={15} className="text-primary" /> Takvim
            </h2>
            <p className="text-xs text-text-muted mb-3">
              Onaylı kayıtlı olduğun yaklaşan etkinlikleri tek .ics dosyasında indir (Google / Apple Takvim).
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { data } = await api.get<Blob>('/events/joined/calendar.ics', { responseType: 'blob' });
                  const url = URL.createObjectURL(data);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'gonulluai-katildigim-etkinlikler.ics';
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Takvim dosyası indirildi');
                } catch {
                  toast.error('İndirilemedi — giriş yapmış olmalısın');
                }
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-primary/30 text-primary text-sm font-semibold hover:bg-primary-light transition-colors"
            >
              <Download size={16} />
              Katıldığım etkinlikler (.ics)
            </button>
          </div>

          {/* Kaydet */}
          <button
            type="submit"
            disabled={saving || !fullName.trim()}
            className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Değişiklikleri Kaydet
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
