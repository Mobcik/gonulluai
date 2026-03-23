import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/** `/profile` → oturumdaki kullanıcının `/profile/:id` sayfasına yönlendirir */
const ProfileSelfRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/profile' }} />;

  return <Navigate to={`/profile/${user.id}`} replace />;
};

export default ProfileSelfRedirect;
