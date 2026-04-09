import { Link, useNavigate } from 'react-router-dom';
import { NetworkBackground } from '../../components/ui/network-background';

export function Landing() {
  const navigate = useNavigate();

  const handleDemo = (role: 'student' | 'pi') => {
    navigate(role === 'student' ? '/student/dashboard' : '/pi/dashboard');
  };

  return (
    <div className="page-landing min-h-screen flex flex-col relative overflow-x-hidden bg-white text-[#0052CC]">
      {/* Network Background - nodes, connections, pulses */}
      <NetworkBackground />

      {/* Content: full width + centered stack (avoids drift from body sidebar padding) */}
      <div className="relative z-[150] flex w-full flex-1 flex-col items-center justify-center px-4 pb-24 text-center sm:pb-0">
        <div className="flex w-full max-w-5xl flex-col items-center justify-center">
        <h1 className="mb-8 w-full max-w-5xl text-5xl font-bold text-[#0052CC] md:text-8xl">
          The Smarter Way to Find Research
        </h1>
        <p className="mb-12 max-w-xl w-full text-lg leading-relaxed text-[#0052CC] md:text-xl">
          Browse positions, apply to labs, and grow your research career. For UF, by UF.
        </p>
        <div className="relative z-[130] flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="relative w-48 min-h-[3.5rem]">
            <Link
              to="/register"
              className="absolute inset-0 flex items-center justify-center rounded-2xl text-lg font-semibold transition-all hover:cursor-pointer duration-300 hover:scale-105 shadow-lg hover:shadow-xl no-underline"
              style={{ background: '#0052CC', color: '#ffffff' }}
            >
              Register
            </Link>
          </div>
          <div className="relative w-48 min-h-[3.5rem]">
            <Link
              to="/login"
              className="absolute inset-0 flex items-center justify-center backdrop-blur-lg rounded-2xl text-lg font-semibold transition-all duration-300 hover:cursor-pointer hover:scale-105 shadow-lg hover:shadow-xl no-underline"
              style={{ border: '2px solid #0052CC', color: '#0052CC' }}
            >
              Login
            </Link>
          </div>
        </div>
        <div className="relative z-[130] mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <p className="w-full text-center text-sm text-[#0052CC]/70 sm:w-auto">
            Try a demo:
          </p>
          <button
            onClick={() => handleDemo('student')}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{ background: 'rgba(0,82,204,0.08)', border: '1px solid rgba(0,82,204,0.35)', color: '#0052CC' }}
          >
            Demo Student
          </button>
          <button
            onClick={() => handleDemo('pi')}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{ background: 'rgba(0,82,204,0.08)', border: '1px solid rgba(0,82,204,0.35)', color: '#0052CC' }}
          >
            Demo PI
          </button>
        </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-[100] py-6">
        <div className="text-center text-sm text-[#0052CC]">
          © {new Date().getFullYear()} ResearchHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
