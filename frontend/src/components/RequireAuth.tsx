import { Navigate, useLocation } from 'react-router-dom';

const AUTH_TOKEN_KEY = 'auth_token';

interface RequireAuthProps {
  children: React.ReactElement;
}

/**
 * Protects routes that require a valid auth token.
 * Redirects to /login if not authenticated (saves intended path for post-login redirect if desired later).
 */
export const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
