import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Leaf, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as any)?.from || '/dashboard';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Hoş geldin! 🌿');
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Giriş başarısız. Bilgileri kontrol et.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-lighter px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-green">
            <Leaf size={26} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-text">Tekrar hoş geldin</h1>
          <p className="text-text-muted mt-1">GönüllüAI hesabına giriş yap</p>
        </div>


        {/* Card */}
        <div className="card shadow-card-hover">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">E-posta</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="ornek@email.com"
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-text">Şifre</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Şifremi Unuttum</Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Giriş Yap
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Ücretsiz Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
