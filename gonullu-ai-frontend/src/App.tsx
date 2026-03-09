import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Home        from './pages/Home';
import Dashboard   from './pages/Dashboard';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Discover    from './pages/Discover';
import EventDetail from './pages/EventDetail';
import EventCreate from './pages/EventCreate';
import EventEdit   from './pages/EventEdit';
import Profile     from './pages/Profile';
import Settings        from './pages/Settings';
import Leaderboard     from './pages/Leaderboard';
import Rewards         from './pages/Rewards';
import Calendar        from './pages/Calendar';
import Journal         from './pages/Journal';
import EventAnalytics  from './pages/EventAnalytics';
import Skills          from './pages/Skills';
import Impact          from './pages/Impact';
import ClubsList       from './pages/ClubsList';
import ClubDetail      from './pages/ClubDetail';
import ClubCreate      from './pages/ClubCreate';

// Giriş yapmış kullanıcıyı dashboard'a yönlendir
const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Home />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: '"DM Sans", sans-serif',
              background: '#2D2416',
              color: '#F7F3EE',
              borderRadius: '12px',
              padding: '12px 20px',
            },
            success: { iconTheme: { primary: '#3D7A4F', secondary: '#F7F3EE' } },
          }}
        />
        <ErrorBoundary>
          <Navbar />
        </ErrorBoundary>
        <ErrorBoundary>
        <Routes>
          <Route path="/"            element={<HomeRoute />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/discover"    element={<Discover />} />
          <Route path="/events/new"       element={<EventCreate />} />
          <Route path="/events/:id/edit" element={<EventEdit />} />
          <Route path="/events/:id"      element={<EventDetail />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/settings"                    element={<Settings />} />
          <Route path="/leaderboard"                 element={<Leaderboard />} />
          <Route path="/rewards"                     element={<Rewards />} />
          <Route path="/calendar"                    element={<Calendar />} />
          <Route path="/journal"                     element={<Journal />} />
          <Route path="/events/:id/analytics"        element={<EventAnalytics />} />
          <Route path="/skills"                      element={<Skills />} />
          <Route path="/impact"                      element={<Impact />} />
          <Route path="/clubs"                       element={<ClubsList />} />
          <Route path="/clubs/new"                   element={<ClubCreate />} />
          <Route path="/clubs/:id"                   element={<ClubDetail />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
