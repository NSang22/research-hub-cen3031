import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(email, password, role, firstName, lastName);
      const dest =
        user.role === 'student' ? '/student/dashboard' :
        user.role === 'admin'   ? '/admin/dashboard' :
        '/pi/dashboard';
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-6">Create your ResearchHub account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
            >
              <option value="student">Student</option>
              <option value="pi">Principal Investigator (PI)</option>
              <option value="admin">Lab Administrator</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div className="mt-4">
          <div className="relative flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or sign up with Google</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (response) => {
                if (!response.credential) return;
                setError('');
                setLoading(true);
                try {
                  const user = await loginWithGoogle(response.credential, role);
                  const dest =
                    user.role === 'student' ? '/student/dashboard' :
                    user.role === 'admin'   ? '/admin/dashboard' :
                    '/pi/dashboard';
                  navigate(dest, { replace: true });
                } catch (err: unknown) {
                  setError((err as { message?: string })?.message || 'Google sign-up failed');
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => setError('Google sign-up failed')}
              text="signup_with"
              shape="rectangular"
              width="368"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">@ufl.edu accounts only · uses the role selected above</p>
        </div>
        <p className="mt-4 text-center text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-600 hover:underline">
            Sign in
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
