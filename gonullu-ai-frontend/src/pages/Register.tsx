import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf, Mail, Lock, User, MapPin, CheckCircle, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Mersin', 'Diyarbakır', 'Samsun', 'Trabzon', 'Eskişehir', 'Diğer'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email:     '',
    password:  '',
    confirm:   '',
    city:      '',
  });
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const isEdu   = form.email.endsWith('.edu.tr') || form.email.endsWith('.edu');
  const pwMatch = form.password === form.confirm;
  const pwOk    = form.password.length >= 8;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwMatch) { toast.error('Şifreler eşleşmiyor'); return; }
    if (!pwOk)    { toast.error('Şifre en az 8 karakter olmalı'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name, form.city || undefined);
      toast.success('Hoş geldin! 🌿 Sana özel dashboard hazır.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Kayıt başarısız. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-lighter px-4 py-8 pt-24">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-green">
            <Leaf size={26} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-text">GönüllüAI'ya Katıl</h1>
          <p className="text-text-muted mt-1">Ücretsiz hesap oluştur, değişimi başlat</p>
        </div>

        <div className="card shadow-card-hover">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Ad Soyad</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={set('full_name')}
                  required
                  placeholder="Adın Soyadın"
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">E-posta</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                  placeholder="ornek@email.com veya ornek@uni.edu.tr"
                  className="input pl-10"
                />
              </div>
              {isEdu && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
                  <GraduationCap size={13} />
                  Üniversite e-postası tespit edildi! Öğrenci rozeti otomatik eklenecek.
                </div>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Şehir <span className="text-text-muted font-normal">(opsiyonel)</span></label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <select value={form.city} onChange={set('city')} className="input pl-10 appearance-none cursor-pointer">
                  <option value="">Şehir seç...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Şifre</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  placeholder="En az 8 karakter"
                  className="input pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${pwOk ? 'text-primary' : 'text-red-500'}`}>
                  <CheckCircle size={12} />
                  {pwOk ? 'Şifre güçlü' : 'En az 8 karakter gerekli'}
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Şifre Tekrar</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  required
                  placeholder="Şifrenizi tekrar girin"
                  className="input pl-10"
                />
              </div>
              {form.confirm && (
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${pwMatch ? 'text-primary' : 'text-red-500'}`}>
                  <CheckCircle size={12} />
                  {pwMatch ? 'Şifreler eşleşiyor' : 'Şifreler eşleşmiyor'}
                </div>
              )}
            </div>

            <p className="text-xs text-text-muted">
              Kayıt olarak{' '}
              <span className="text-primary cursor-pointer hover:underline">Kullanım Koşullarını</span>
              {' '}ve{' '}
              <span className="text-primary cursor-pointer hover:underline">Gizlilik Politikasını</span>
              {' '}kabul etmiş olursun.
            </p>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Hesap Oluştur
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Zaten hesabın var mı?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
