import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Plus, LogOut, User, Trophy, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './common/Avatar';
import NotificationPanel from './NotificationPanel';
import { badgeInfo } from '../utils/formatPoints';
import { cn } from '../utils/cn';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [scrolled,     setScrolled]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setProfileOpen(false); }, [location]);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navLinks = user
    ? [
        { to: '/dashboard',   label: 'Ana Sayfa' },
        { to: '/discover',    label: 'Keşfet' },
        { to: '/clubs',       label: 'Topluluklar' },
        { to: '/calendar',    label: 'Takvim' },
        { to: '/leaderboard', label: 'Sıralama' },
      ]
    : [
        { to: '/discover',    label: 'Keşfet' },
        { to: '/clubs',       label: 'Topluluklar' },
        { to: '/skills',      label: 'Yetenekler' },
        { to: '/leaderboard', label: 'Sıralama' },
      ];

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-card' : 'bg-white/80 backdrop-blur-sm'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/logo.svg"
              alt="GönüllüAI logo"
              className="w-9 h-9 group-hover:scale-110 transition-transform drop-shadow-sm"
            />
            <span className="font-display font-bold text-xl text-text">Gönüllü<span className="text-primary">AI</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.to)
                    ? 'bg-primary-light text-primary'
                    : 'text-text-soft hover:text-text hover:bg-earth-lighter'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/events/new"
                  className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-chip text-sm font-semibold shadow-green hover:bg-primary-dark hover:shadow-green-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Plus size={15} />
                  Etkinlik Oluştur
                </Link>

                <NotificationPanel />

                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 hover:bg-earth-lighter rounded-xl transition-colors"
                  >
                    <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-text leading-none">{user.full_name.split(' ')[0]}</p>
                      <p className="text-xs text-text-muted leading-none mt-0.5">{badgeInfo[user.badge]?.emoji ?? '🌱'} {user.total_points} puan</p>
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-card-hover border border-earth-lighter overflow-hidden animate-fadeIn">
                      <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        <LayoutDashboard size={16} />
                        Ana Sayfam
                      </Link>
                      <Link to={`/profile/${user.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        <User size={16} />
                        Profilim
                      </Link>
                      <Link to="/leaderboard" className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        <Trophy size={16} />
                        Sıralama
                      </Link>
                      <Link to="/rewards" className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        🎁 <span>Ödüllerim</span>
                      </Link>
                      <Link to="/journal" className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        📖 <span>Günlüğüm</span>
                      </Link>
                      <Link to="/skills" className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        🔧 <span>Yetenek Pazaryeri</span>
                      </Link>
                      <Link to="/impact" className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        🌍 <span>Etki Raporium</span>
                      </Link>
                      <Link to="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter transition-colors text-sm text-text">
                        <Settings size={16} />
                        Profili Düzenle
                      </Link>
                      <hr className="border-earth-lighter" />
                      <button
                        onClick={() => { logout(); navigate('/'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-sm text-red-500"
                      >
                        <LogOut size={16} />
                        Çıkış Yap
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-text-soft hover:text-text transition-colors px-4 py-2">
                  Giriş Yap
                </Link>
                <Link to="/register" className="bg-primary text-white px-5 py-2 rounded-chip text-sm font-semibold shadow-green hover:bg-primary-dark hover:shadow-green-lg transition-all duration-200">
                  Ücretsiz Katıl
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-text-soft hover:text-text hover:bg-earth-lighter rounded-lg transition-colors"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-earth-lighter animate-fadeIn">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'block px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive(link.to) ? 'bg-primary-light text-primary' : 'text-text-soft hover:bg-earth-lighter'
                )}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-earth-lighter my-2" />
            {user ? (
              <>
                <Link to={`/profile/${user.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-earth-lighter rounded-xl text-sm text-text">
                  <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                  <span>{user.full_name}</span>
                </Link>
                <Link to="/events/new" className="flex items-center gap-2 px-4 py-3 bg-primary-light text-primary rounded-xl text-sm font-medium">
                  <Plus size={16} /> Etkinlik Oluştur
                </Link>
                <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left px-4 py-3 text-red-500 text-sm hover:bg-red-50 rounded-xl">
                  Çıkış Yap
                </button>
              </>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link to="/login" className="flex-1 text-center py-2.5 border border-earth-light rounded-chip text-sm text-earth font-medium">Giriş Yap</Link>
                <Link to="/register" className="flex-1 text-center py-2.5 bg-primary rounded-chip text-sm text-white font-semibold">Kayıt Ol</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
