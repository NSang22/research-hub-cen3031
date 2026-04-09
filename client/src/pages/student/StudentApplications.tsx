import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import './student-applications.css';

interface AppWithMeta {
  id: string;
  positionId: string;
  status: string;
  appliedAt: string;
  positionTitle?: string;
  labName?: string;
  department?: string | null;
}

function formatAppliedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function relativeAppliedLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startD.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays < 0) return '';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}w ago`;
}

function labDepartmentLine(lab?: string | null, department?: string | null): string | null {
  const L = lab?.trim();
  const D = department?.trim();
  if (L && D) return `${L} · ${D}`;
  if (D) return D;
  if (L) return L;
  return null;
}

function dotClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'sma-dot sma-dot-pending';
    case 'reviewing':
      return 'sma-dot sma-dot-reviewing';
    case 'accepted':
      return 'sma-dot sma-dot-accepted';
    case 'rejected':
      return 'sma-dot sma-dot-rejected';
    case 'withdrawn':
      return 'sma-dot sma-dot-withdrawn';
    default:
      return 'sma-dot sma-dot-pending';
  }
}

function badgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'sma-badge-inner sma-badge-pending';
    case 'reviewing':
      return 'sma-badge-inner sma-badge-reviewing';
    case 'accepted':
      return 'sma-badge-inner sma-badge-accepted';
    case 'rejected':
      return 'sma-badge-inner sma-badge-rejected';
    case 'withdrawn':
      return 'sma-badge-inner sma-badge-withdrawn';
    default:
      return 'sma-badge-inner sma-badge-pending';
  }
}

function badgeLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    reviewing: 'Reviewing',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status] ?? status;
}

export function StudentApplications() {
  const [applications, setApplications] = useState<AppWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.applications
      .mine()
      .then(setApplications)
      .finally(() => setLoading(false));
  }, []);

  const count = applications.length;
  const subtitle =
    count === 1 ? '1 application submitted' : `${count} applications submitted`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="sma-page">
        <div className="sma-inner">
          <h1 className="sma-title">My Applications</h1>
          {!loading ? <p className="sma-subtitle">{subtitle}</p> : null}

          {loading ? (
            <div className="sma-card">
              <div className="animate-pulse p-6 space-y-4">
                <div className="h-4 bg-slate-200 rounded w-full max-w-md" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-200 rounded-lg" />
                ))}
              </div>
            </div>
          ) : count === 0 ? (
            <div className="sma-card">
              <div className="sma-empty">
                <svg
                  className="sma-empty-icon mx-auto block"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                <p className="sma-empty-title">No applications yet</p>
                <p className="sma-empty-sub">Browse open positions and apply to get started</p>
                <Link to="/student/positions" className="sma-empty-link">
                  Browse Positions →
                </Link>
              </div>
            </div>
          ) : (
            <div className="sma-card">
              <div className="sma-list-header">
                <span className="sma-dot-spacer" aria-hidden />
                <span className="sma-h-label sma-h-position">Position</span>
                <span className="sma-h-label sma-h-status">Status</span>
                <span className="sma-h-label sma-h-applied">Applied</span>
              </div>
              {applications.map((app) => {
                const meta = labDepartmentLine(app.labName, app.department);
                return (
                  <Link
                    key={app.id}
                    to={`/student/positions/${app.positionId}`}
                    className="sma-row"
                  >
                    <span className={dotClass(app.status)} aria-hidden />
                    <div className="sma-position-block">
                      <p className="sma-position-title">{app.positionTitle || 'Position'}</p>
                      {meta ? <p className="sma-position-meta">{meta}</p> : null}
                    </div>
                    <div className="sma-badge">
                      <span className={badgeClass(app.status)}>{badgeLabel(app.status)}</span>
                    </div>
                    <div className="sma-applied">
                      <p className="sma-applied-date">{formatAppliedDate(app.appliedAt)}</p>
                      <p className="sma-applied-rel">{relativeAppliedLabel(app.appliedAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
