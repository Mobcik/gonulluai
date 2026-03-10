import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Leaf } from 'lucide-react';

interface Props {
  children: ReactNode;
}

/**
 * Kimlik doğrulama gerektiren rotalar için bariyer bileşeni.
 * Giriş yapmamış kullanıcıyı /login'e yönlendirir ve
 * giriş sonrası geri dönmesi için mevcut konumu state olarak iletir.
 */
const ProtectedRoute = ({ children }: Props) => {
  const { user, loading } = useAuth();
  const location          = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-lighter">
        <div className="flex flex-col items-center gap-3 text-primary">
          <Leaf size={32} className="animate-pulse" />
          <p className="text-sm font-medium text-text-muted">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
