import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Users,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TubelightNavBar } from './ui/tubelight-navbar';
import type { NavItem } from './ui/tubelight-navbar';

interface NavbarProps {
  variant?: 'default' | 'landing';
}

export function Navbar({ variant = 'default' }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const publicItems: NavItem[] = [
    { name: 'Home', url: '/', icon: Home },
    { name: 'Login', url: '/login', icon: LogIn },
    { name: 'Register', url: '/register', icon: UserPlus },
  ];

  const studentItems: NavItem[] = [
    { name: 'Dashboard', url: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Positions', url: '/student/positions', icon: Briefcase },
    { name: 'Applications', url: '/student/applications', icon: FileText },
    { name: 'Participant', url: '/student/participant', icon: FlaskConical },
    { name: 'Profile', url: '/student/profile', icon: User },
  ];

  const piItems: NavItem[] = [
    { name: 'Dashboard', url: '/pi/dashboard', icon: LayoutDashboard },
    { name: 'Positions', url: '/pi/positions/new', icon: Briefcase },
    { name: 'Students', url: '/pi/students', icon: Users },
    { name: 'Profile', url: '/pi/profile', icon: User },
  ];

  const items = user
    ? user.role === 'student'
      ? studentItems
      : piItems
    : publicItems;

  const isLanding = variant === 'landing';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[110] flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 ${
          isLanding ? 'border-b border-white/10' : ''
        }`}
        style={isLanding ? { color: 'rgb(255,165,0)', background: '#001A3E' } : undefined}
      >
        <Link
          to="/"
          className={`text-xl font-bold ${
            isLanding
              ? 'hover:opacity-80'
              : 'text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300'
          }`}
        >
          ResearchHub
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span
                className={`hidden sm:inline text-sm ${
                  isLanding ? '' : 'text-inherit dark:text-slate-400'
                }`}
              >
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className={`px-4 py-2 text-sm font-medium rounded-full ${
                  isLanding
                    ? 'bg-white/10 hover:bg-white/20 border border-orange-400/40'
                    : 'text-inherit dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </nav>
      <TubelightNavBar items={items} forceBottom={false} />
    </>
  );
}
