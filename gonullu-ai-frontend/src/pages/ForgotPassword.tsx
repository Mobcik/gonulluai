import { Link } from 'react-router-dom';
import { Leaf, ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => (
  <div className="min-h-screen flex items-center justify-center bg-earth-lighter px-4 py-8 pt-24">
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-green">
          <Leaf size={26} className="text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-text">Şifre sıfırlama</h1>
        <p className="text-text-muted mt-2 text-sm">
          E-posta ile otomatik şifre sıfırlama henüz etkin değil.
        </p>
      </div>

      <div className="card shadow-card-hover space-y-5">
        <div className="flex gap-3 p-4 rounded-xl bg-primary-light/40 border border-primary/15 text-sm text-text">
          <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden />
          <p>
            Şifreni unuttuysan yönetici veya destek kanalından yardım isteyebilirsin. İleride bu sayfadan e-posta
            doğrulamalı sıfırlama eklenecek.
          </p>
        </div>

        <ul className="text-xs text-text-muted space-y-2 list-disc list-inside">
          <li>Giriş bilgilerini doğru yazdığından emin ol (e-postada büyük/küçük harf).</li>
          <li>Yeni hesap için <Link to="/register" className="text-primary font-semibold hover:underline">kayıt ol</Link> sayfasını kullan.</li>
        </ul>

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-chip border-[1.5px] border-earth-light text-earth font-semibold text-sm hover:bg-primary-light transition-colors"
        >
          <ArrowLeft size={16} aria-hidden />
          Girişe dön
        </Link>
      </div>
    </div>
  </div>
);

export default ForgotPassword;
