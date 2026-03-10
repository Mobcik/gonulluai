import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar         from './components/Navbar';
import ErrorBoundary  from './components/ErrorBoundary';
import ProtectedRoute from './components/routing/ProtectedRoute';

// Public pages
import Home        from './pages/Home';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Discover    from './pages/Discover';
import Leaderboard from './pages/Leaderboard';
import ClubsList   from './pages/ClubsList';
import ClubDetail  from './pages/ClubDetail';
import Impact      from './pages/Impact';

// Protected pages (giriş zorunlu)
import Dashboard      from './pages/Dashboard';
import EventDetail    from './pages/EventDetail';
import EventCreate    from './pages/EventCreate';
import EventEdit      from './pages/EventEdit';
import EventAnalytics from './pages/EventAnalytics';
import Profile        from './pages/Profile';
import Settings       from './pages/Settings';
import Rewards        from './pages/Rewards';
import Calendar       from './pages/Calendar';
import Journal        from './pages/Journal';
import Skills         from './pages/Skills';
import ClubCreate     from './pages/ClubCreate';

/** Giriş yapmış kullanıcıyı anasayfa yerine dashboard'a yönlendir */
const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Home />;
};

const App = () => (
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
          {/* ── Public ──────────────────────────────────────────────────── */}
          <Route path="/"            element={<HomeRoute />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/discover"    element={<Discover />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/impact"      element={<Impact />} />
          <Route path="/clubs"       element={<ClubsList />} />
          <Route path="/clubs/:id"   element={<ClubDetail />} />

          {/* ── Protected (giriş zorunlu) ───────────────────────────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/profile/:id" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/rewards" element={
            <ProtectedRoute><Rewards /></ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute><Calendar /></ProtectedRoute>
          } />
          <Route path="/journal" element={
            <ProtectedRoute><Journal /></ProtectedRoute>
          } />
          <Route path="/skills" element={
            <ProtectedRoute><Skills /></ProtectedRoute>
          } />
          <Route path="/clubs/new" element={
            <ProtectedRoute><ClubCreate /></ProtectedRoute>
          } />
          <Route path="/events/new" element={
            <ProtectedRoute><EventCreate /></ProtectedRoute>
          } />
          <Route path="/events/:id" element={
            <ProtectedRoute><EventDetail /></ProtectedRoute>
          } />
          <Route path="/events/:id/edit" element={
            <ProtectedRoute><EventEdit /></ProtectedRoute>
          } />
          <Route path="/events/:id/analytics" element={
            <ProtectedRoute><EventAnalytics /></ProtectedRoute>
          } />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
