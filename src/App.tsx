import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { Posts } from '@/pages/Posts';
import { PostCalendar } from '@/pages/PostCalendar';
import { Analytics } from '@/pages/Analytics';
import { MediaLibrary } from '@/pages/MediaLibrary';
import { Settings } from '@/pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="posts" element={<Posts />} />
            <Route path="calendar" element={<PostCalendar />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
