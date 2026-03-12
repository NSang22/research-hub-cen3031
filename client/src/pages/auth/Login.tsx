import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const dest = user.role === 'student' ? '/student/dashboard' : '/pi/dashboard';
      navigate(from || dest, { replace: true });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 pt-24 pb-24">
        <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-6">Sign in to ResearchHub</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4">
          <div className="relative flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (response) => {
                if (!response.credential) return;
                setError('');
                setLoading(true);
                try {
                  const user = await loginWithGoogle(response.credential);
                  const dest = user.role === 'student' ? '/student/dashboard' : '/pi/dashboard';
                  navigate(from || dest, { replace: true });
                } catch (err: unknown) {
                  setError((err as { message?: string })?.message || 'Google sign-in failed');
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => setError('Google sign-in failed')}
              text="signin_with"
              shape="rectangular"
              width="368"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">@ufl.edu accounts only</p>
        </div>
        <p className="mt-4 text-center text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-600 hover:underline">
            Register
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
