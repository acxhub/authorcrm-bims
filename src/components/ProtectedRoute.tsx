import { useAuth, useProfile } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'leads_manager' | 'sales_manager' | 'sales';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    console.log('ProtectedRoute state:', { user: !!user, loading, profile, profileLoading });
  }, [user, loading, profile, profileLoading]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-xs text-gray-400 mt-2">
            User: {user ? 'Found' : 'None'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && profile && profile.role !== requiredRole) {
    console.log('User role not authorized, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
