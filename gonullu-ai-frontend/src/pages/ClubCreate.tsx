import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, FileText, ShieldAlert, CheckCircle, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clubsApi } from '../api/clubs';
import { useAuth } from '../contexts/AuthContext';

const UNIVERSITY_OPTIONS = [
  'İstanbul Teknik Üniversitesi',
  'Orta Doğu Teknik Üniversitesi',
  'Boğaziçi Üniversitesi',
  'Hacettepe Üniversitesi',
  'Ankara Üniversitesi',
  'Ege Üniversitesi',
  'İstanbul Üniversitesi',
  'Marmara Üniversitesi',
  'Bilkent Üniversitesi',
  'Koç Üniversitesi',
  'Sabancı Üniversitesi',
  'Dokuz Eylül Üniversitesi',
  'Yıldız Teknik Üniversitesi',
  'Gazi Üniversitesi',
  'Selçuk Üniversitesi',
];

const ClubCreate = () => {
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [name,        setName]        = useState('');
  const [university,  setUniversity]  = useState(user?.university_name || '');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [done,        setDone]        = useState(false);

  // Giriş yapmamış
  if (!user) {
    return (
      <div className="min-h-screen pt-16 bg-earth-lighter/40 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={24} className="text-amber-500" />
          </div>
          <h2 className="font-display font-bold text-xl text-text mb-2">Giriş Yapman Gerekiyor</h2>
          <p className="text-text-muted text-sm mb-6">Kulüp oluşturmak için önce giriş yap.</p>
          <Link to="/login" className="btn-primary px-8">Giriş Yap</Link>
        </div>
      </div>
    );
  }

  // Öğrenci değil
  if (!user.is_student) {
    return (
      <div className="min-h-screen pt-16 bg-earth-lighter/40 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={24} className="text-amber-500" />
          </div>
          <h2 className="font-display font-bold text-xl text-text mb-2">Öğrenci Hesabı Gerekli</h2>
          <p className="text-text-muted text-sm mb-2">
            Kulüp oluşturmak için <strong>.edu.tr</strong> uzantılı öğrenci e-postası gereklidir.
          </p>
          <p className="text-text-muted text-sm mb-6">
            Mevcut hesabın: <span className="font-medium text-text">{user.email}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/clubs')} className="btn-secondary px-5">
              Geri Dön
            </button>
            <Link to="/settings" className="btn-primary px-5">
              Profili Güncelle
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Başarı ekranı
  if (done) {
    return (
      <div className="min-h-screen pt-16 bg-earth-lighter/40 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-primary" />
          </div>
          <h2 className="font-display font-bold text-2xl text-text mb-2">Başvuru Alındı! 🎉</h2>
          <p className="text-text-soft text-sm mb-2">
            Kulübün oluşturma başvurusu alındı. Admin onayından sonra topluluklar listesinde görünecek.
          </p>
          <p className="text-text-muted text-xs mb-6">
            Onay süreci genellikle 1-3 iş günü içinde tamamlanır.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/clubs" className="btn-secondary px-5">
              Topluluklara Git
            </Link>
            <Link to="/dashboard" className="btn-primary px-5">
              Ana Sayfam
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !university.trim()) return;
    setSaving(true);
    try {
      await clubsApi.create({
        name:        name.trim(),
        university:  university.trim(),
        description: description.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Kulüp oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Geri butonu */}
        <button
          onClick={() => navigate('/clubs')}
          className="flex items-center gap-2 text-sm text-text-soft hover:text-text transition-colors group mb-8"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Topluluklara Dön
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
              <Building2 size={18} className="text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-text">Yeni Kulüp Oluştur</h1>
          </div>
          <p className="text-text-soft text-sm ml-13">
            Üniversitende gönüllülük kulübü kur, etkinlik düzenle ve topluluk yönet.
          </p>
        </div>

        {/* Bilgilendirme kartı */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
          <Sparkles size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Admin Onayı Gereklidir</p>
            <p className="text-xs text-amber-700">
              Başvurunu aldıktan sonra ekibimiz inceleyip onaylayacak. Onaylanan kulüpler
              "Doğrulanmış" rozeti ile listelenir.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Kulüp Adı */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
              <Building2 size={15} className="text-primary" /> Kulüp Bilgileri
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-1.5">
                  Kulüp Adı *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="örn. İTÜ Gönüllüler Derneği"
                  className="input w-full"
                />
                <p className="text-xs text-text-muted mt-1 text-right">{name.length}/100</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-soft uppercase tracking-wide block mb-1.5">
                  Üniversite *
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={e => setUniversity(e.target.value)}
                  required
                  list="university-list"
                  placeholder="Üniversite adı"
                  className="input w-full"
                />
                <datalist id="university-list">
                  {UNIVERSITY_OPTIONS.map(u => <option key={u} value={u} />)}
                </datalist>
                {user.university_name && university !== user.university_name && (
                  <button
                    type="button"
                    onClick={() => setUniversity(user.university_name!)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Profilimden al: {user.university_name}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Açıklama */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-4 flex items-center gap-2">
              <FileText size={15} className="text-primary" /> Kulüp Açıklaması
            </h2>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Kulübünüz hakkında kısa bir açıklama yazın. Hangi alanlarda faaliyet gösteriyorsunuz?"
              className="input w-full resize-none"
            />
            <p className="text-xs text-text-muted mt-1 text-right">{description.length}/500</p>
          </div>

          {/* Öğrenci bilgisi */}
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-semibold text-text text-sm mb-3 flex items-center gap-2">
              <Users size={15} className="text-primary" /> Organizatör Bilgisi
            </h2>
            <div className="flex items-center gap-3 text-sm text-text-soft">
              <div className="w-8 h-8 bg-primary-light rounded-xl flex items-center justify-center">
                <CheckCircle size={14} className="text-primary" />
              </div>
              <div>
                <p className="font-medium text-text">{user.full_name}</p>
                <p className="text-xs">{user.email} · Öğrenci hesabı ✓</p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !name.trim() || !university.trim()}
            className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Building2 size={18} />
                Başvuruyu Gönder
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClubCreate;
