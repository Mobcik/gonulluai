import { Link } from 'react-router-dom';
import { Leaf, Star, Users, Award, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';
import { categoryEmoji } from '../utils/formatPoints';

const CATEGORIES = ['Çevre', 'Eğitim', 'Sağlık', 'Hayvan Hakları', 'Yaşlı Bakımı', 'Çocuk Gelişimi', 'Teknoloji', 'Sanat & Kültür'];

const STATS = [
  { value: '12,500+', label: 'Aktif Gönüllü',  icon: <Users size={22} className="text-primary" /> },
  { value: '3,200+',  label: 'Etkinlik',         icon: <Star  size={22} className="text-amber-500" /> },
  { value: '48',      label: 'Şehir',            icon: <Leaf  size={22} className="text-primary" /> },
  { value: '850+',    label: 'Gönüllü Kulübü',   icon: <Award size={22} className="text-earth" /> },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Hesap Oluştur',
    desc: 'Ücretsiz kayıt ol, ilgi alanlarını ve yeteneklerini belirt. Öğrenciysen .edu.tr e-postanla üniversite rozetini kazan.',
    icon: <Users size={28} className="text-primary" />,
  },
  {
    step: '02',
    title: 'AI ile Keşfet',
    desc: 'Yapay zeka algoritması sana özel en uygun gönüllülük etkinliklerini sıralar ve kişisel öneriler sunar.',
    icon: <Sparkles size={28} className="text-primary" />,
  },
  {
    step: '03',
    title: 'Katıl ve Doğrula',
    desc: 'Etkinliğe git, QR kod veya 6 haneli kod ile varlığını doğrula. Her etkinlik +35 puana kadar kazandırır.',
    icon: <Shield size={28} className="text-primary" />,
  },
  {
    step: '04',
    title: 'Rozet ve Sertifika Kazan',
    desc: '500 puanda dijital sertifika, 1000 puanda Gönüllü Lideri unvanı. Liderlik tablosunda şehrin zirvesine çık!',
    icon: <Award size={28} className="text-primary" />,
  },
];

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-earth-lighter via-primary-light/30 to-earth-lighter" />
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-earth/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-light text-primary px-4 py-2 rounded-chip text-sm font-semibold mb-6 animate-fadeUp">
              <Sparkles size={14} />
              Yapay Zeka Destekli Gönüllülük Platformu
            </div>

            {/* Title */}
            <h1 className="font-display text-5xl md:text-7xl font-bold text-text leading-tight mb-6 animate-fadeUp" style={{ animationDelay: '0.1s', opacity: 0 }}>
              İyi bir dünya için{' '}
              <span className="text-gradient">harekete geç</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-text-soft max-w-2xl mx-auto mb-10 animate-fadeUp" style={{ animationDelay: '0.2s', opacity: 0 }}>
              GönüllüAI, sana özel etkinlikler keşfet, puan kazan, rozetler topla ve Türkiye'nin gönüllülük liderlik tablosunda yerini al.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fadeUp" style={{ animationDelay: '0.3s', opacity: 0 }}>
              <Link to="/register" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
                Ücretsiz Başla
                <ArrowRight size={18} />
              </Link>
              <Link to="/discover" className="btn-outline text-base px-10 py-4 inline-flex items-center gap-2">
                Etkinlikleri Keşfet
              </Link>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2 justify-center animate-fadeUp" style={{ animationDelay: '0.4s', opacity: 0 }}>
              {CATEGORIES.map(cat => (
                <Link
                  key={cat}
                  to={`/discover?category=${encodeURIComponent(cat)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-chip border border-earth-lighter text-sm text-text-soft hover:border-primary hover:text-primary hover:bg-primary-light transition-all duration-200 shadow-sm"
                >
                  <span>{categoryEmoji[cat]}</span>
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-card bg-earth-lighter hover:shadow-card transition-shadow">
                <div className="flex justify-center mb-3">{stat.icon}</div>
                <div className="font-display text-3xl font-bold text-text">{stat.value}</div>
                <div className="text-sm text-text-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-earth-lighter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-primary font-semibold text-sm uppercase tracking-widest">Nasıl Çalışır</span>
            <h2 className="font-display text-4xl font-bold text-text mt-2">4 adımda gönüllü ol</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-earth-light to-transparent z-0" />
                )}
                <div className="card relative z-10 hover:shadow-card-hover transition-shadow text-center">
                  <div className="text-xs font-bold text-earth-light mb-4 font-display">{item.step}</div>
                  <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-display font-bold text-xl text-text mb-3">{item.title}</h3>
                  <p className="text-text-soft text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI FEATURE HIGHLIGHT */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-primary font-semibold text-sm uppercase tracking-widest">Yapay Zeka</span>
              <h2 className="font-display text-4xl font-bold text-text mt-2 mb-5">
                Sana özel keşif deneyimi
              </h2>
              <p className="text-text-soft text-lg mb-8 leading-relaxed">
                Claude AI, ilgi alanlarını, yeteneklerini ve geçmiş katılımlarını analiz ederek her seferinde en uygun etkinlikleri önüne getirir.
              </p>
              <div className="space-y-4">
                {[
                  { icon: '🎯', title: 'Kişisel Eşleştirme', desc: 'İlgi alanı, şehir ve yetenek bazında %100 uyum skoru' },
                  { icon: '📸', title: 'Fotoğraf Doğrulama', desc: 'Gemini Vision ile sahte fotoğraflara karşı güvenli platform' },
                  { icon: '🏆', title: 'Akıllı Gamification', desc: 'Streak, rozet ve sertifika sistemi ile motivasyon yüksek' },
                ].map((f, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-earth-lighter hover:bg-primary-light transition-colors">
                    <span className="text-2xl">{f.icon}</span>
                    <div>
                      <div className="font-semibold text-text text-sm">{f.title}</div>
                      <div className="text-text-soft text-sm mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Örnek kart görseli */}
            <div className="relative">
              <div className="card shadow-card-hover p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-text text-sm">AI Öneri Motoru</div>
                    <div className="text-xs text-text-muted">Claude tarafından desteklenmektedir</div>
                  </div>
                </div>
                {[
                  { title: 'Ormansızlaşmayı Durdurun', cat: 'Çevre', score: 96, city: 'İstanbul' },
                  { title: 'Çocuk Okuma Atölyesi',    cat: 'Eğitim', score: 88, city: 'Ankara' },
                  { title: 'Sahil Temizliği',          cat: 'Çevre', score: 84, city: 'İzmir' },
                ].map((e, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${i === 0 ? 'bg-primary-light' : 'bg-earth-lighter'}`}>
                    <span className="text-xl">{categoryEmoji[e.cat]}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-text">{e.title}</div>
                      <div className="text-xs text-text-muted">{e.city} · {e.cat}</div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-chip ${i === 0 ? 'bg-primary text-white' : 'bg-earth-light text-white'}`}>
                      {e.score}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* BADGE SYSTEM */}
      <section className="py-20 bg-gradient-to-br from-earth-lighter to-primary-light/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-primary font-semibold text-sm uppercase tracking-widest">Rozet Sistemi</span>
          <h2 className="font-display text-4xl font-bold text-text mt-2 mb-4">Adım adım yüksel</h2>
          <p className="text-text-soft text-lg mb-12 max-w-xl mx-auto">Her etkinlik seni bir üst seviyeye taşır. Efsane Gönüllü unvanını kazanmak için harekete geç!</p>

          <div className="flex flex-wrap gap-4 justify-center">
            {[
              { emoji: '🌱', label: 'Filiz',             pts: '0+',    color: 'bg-green-50 border-green-200' },
              { emoji: '🌿', label: 'Genç Gönüllü',      pts: '100+',  color: 'bg-primary-light border-primary/30' },
              { emoji: '🍃', label: 'Aktif Gönüllü',     pts: '300+',  color: 'bg-primary-light border-primary/50' },
              { emoji: '🌳', label: 'Deneyimli Gönüllü', pts: '700+',  color: 'bg-earth-lighter border-earth-light' },
              { emoji: '⭐', label: 'Gönüllü Lideri',    pts: '1500+', color: 'bg-yellow-50 border-yellow-200' },
              { emoji: '🏆', label: 'Efsane Gönüllü',    pts: '3000+', color: 'bg-amber-50 border-amber-200' },
            ].map((b, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 px-6 py-4 rounded-card border-2 ${b.color} min-w-[120px]`}>
                <span className="text-3xl">{b.emoji}</span>
                <div className="font-semibold text-text text-sm">{b.label}</div>
                <div className="text-xs text-text-muted font-medium">{b.pts} puan</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="text-5xl mb-4">🌿</div>
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Bugün başla, fark yarat
          </h2>
          <p className="text-primary-light text-lg mb-8 opacity-90">
            12.500'den fazla gönüllü zaten harekete geçti. Sen de katıl.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary px-10 py-4 rounded-chip font-bold text-base hover:bg-primary-light transition-colors inline-flex items-center gap-2">
              <Zap size={18} />
              Hemen Başla — Ücretsiz
            </Link>
            <Link to="/discover" className="border-2 border-white/50 text-white px-10 py-4 rounded-chip font-semibold text-base hover:bg-white/10 transition-colors">
              Etkinliklere Göz At
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-text py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                <Leaf size={14} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white">Gönüllü<span className="text-primary-light">AI</span></span>
            </div>
            <p className="text-text-muted text-sm text-center">
              GönüllüAI v4.0 — Gönüllülük Çalışmaları Dersi Projesi · FastAPI + React + Claude AI
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-text-muted">
              <Link to="/discover" className="hover:text-white transition-colors">Keşfet</Link>
              <Link to="/leaderboard" className="hover:text-white transition-colors">Sıralama</Link>
              <Link to="/legal/terms" className="hover:text-white transition-colors">Kullanım</Link>
              <Link to="/legal/privacy" className="hover:text-white transition-colors">Gizlilik</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
