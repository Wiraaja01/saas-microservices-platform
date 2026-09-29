import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Saat cek auth (fetch /me), tampilkan loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-600 mx-auto mb-4"></div>
          <p className="text-ink-500 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Belum login → redirect ke /login
  return user ? children : <Navigate to="/login" replace />;
}