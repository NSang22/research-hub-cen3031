import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Users,
  Settings,
  UsersRound,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

function studentNavActive(pathname: string, url: string): boolean {
  if (url === '/student/dashboard') return pathname === '/student/dashboard';
  if (url === '/student/positions') return pathname.startsWith('/student/positions');
  if (url === '/student/applications') return pathname === '/student/applications';
  if (url === '/student/profile') return pathname === '/student/profile';
  if (url === '/student/settings') return pathname === '/student/settings';
  return false;
}

function piNavActive(pathname: string, url: string): boolean {
  if (url === '/pi/dashboard') return pathname === '/pi/dashboard';
  if (url === '/pi/metrics') return pathname === '/pi/metrics';
  if (url === '/pi/positions/new') return pathname.startsWith('/pi/positions');
  if (url === '/pi/roster') return pathname === '/pi/roster';
  if (url === '/pi/students') return pathname.startsWith('/pi/students');
  if (url === '/pi/profile') return pathname === '/pi/profile';
  return false;
}

const publicItems: NavItem[] = [
  { name: 'Home', url: '/', icon: Home },
  { name: 'Login', url: '/login', icon: LogIn },
  { name: 'Register', url: '/register', icon: UserPlus },
];

const studentMainItems: NavItem[] = [
  { name: 'Dashboard', url: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Browse Positions', url: '/student/positions', icon: Briefcase },
  { name: 'My Applications', url: '/student/applications', icon: FileText },
];

const studentAccountItems: NavItem[] = [
  { name: 'Profile', url: '/student/profile', icon: User },
  { name: 'Settings', url: '/student/settings', icon: Settings },
];

const piLabItems: NavItem[] = [
  { name: 'Dashboard', url: '/pi/dashboard', icon: LayoutDashboard },
  { name: 'Metrics', url: '/pi/metrics', icon: BarChart3 },
  { name: 'Positions', url: '/pi/positions/new', icon: Briefcase },
  { name: 'Roster', url: '/pi/roster', icon: UsersRound },
];

const piAccountItems: NavItem[] = [
  { name: 'Profile', url: '/pi/profile', icon: User },
  { name: 'Students', url: '/pi/students', icon: Users },
];

const sectionLabelClass = 'px-6 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider';
const sectionLabelStyle = { color: '#8b90ad' } as const;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderLink = (item: NavItem, active: boolean) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        to={item.url}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-[3px]"
        style={{
          borderLeftColor: active ? '#0052CC' : 'transparent',
          color: active ? '#0052CC' : 'rgba(0,82,204,0.55)',
          background: active ? 'rgba(0,82,204,0.08)' : 'transparent',
        }}
      >
        <Icon size={18} strokeWidth={2} />
        {item.name}
      </Link>
    );
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col z-[110]"
      style={{ background: '#ffffff', borderRight: '1px solid rgba(0,82,204,0.2)' }}
    >
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(0,82,204,0.2)' }}>
        <Link to={user?.role === 'student' ? '/student/dashboard' : user?.role === 'pi' ? '/pi/dashboard' : '/'} style={{ color: '#0052CC', fontWeight: 700, fontSize: '1.1rem' }}>
          ResearchHub
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {!user && (
          <div className="px-3 space-y-1">
            {publicItems.map((item) => {
              const isActive =
                item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);
              return renderLink(item, isActive);
            })}
          </div>
        )}

        {user?.role === 'student' && (
          <>
            <div className={sectionLabelClass} style={sectionLabelStyle}>
              Menu
            </div>
            <div className="px-3 space-y-0.5">
              {studentMainItems.map((item) => renderLink(item, studentNavActive(pathname, item.url)))}
            </div>
            <div className={sectionLabelClass} style={sectionLabelStyle}>
              Account
            </div>
            <div className="px-3 space-y-0.5 pb-2">
              {studentAccountItems.map((item) => renderLink(item, studentNavActive(pathname, item.url)))}
            </div>
          </>
        )}

        {user?.role === 'pi' && (
          <>
            <div className={sectionLabelClass} style={sectionLabelStyle}>
              Lab
            </div>
            <div className="px-3 space-y-0.5">
              {piLabItems.map((item) => renderLink(item, piNavActive(pathname, item.url)))}
            </div>
            <div className={sectionLabelClass} style={sectionLabelStyle}>
              Account
            </div>
            <div className="px-3 space-y-0.5 pb-2">
              {piAccountItems.map((item) => renderLink(item, piNavActive(pathname, item.url)))}
            </div>
          </>
        )}
      </nav>

      {user && (
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(0,82,204,0.2)' }}>
          <p className="text-xs mb-3 truncate" style={{ color: 'rgba(0,82,204,0.55)' }}>
            {user.firstName} {user.lastName}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm rounded-lg font-medium"
            style={{
              background: 'rgba(0,82,204,0.06)',
              color: '#0052CC',
              border: '1px solid rgba(0,82,204,0.25)',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}
