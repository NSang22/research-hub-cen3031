import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { PIProfile, Position } from '../../types';
import './pi-dashboard.css';

type PositionRow = Position & { appCount?: number };

interface AppWithMeta {
  id: string;
  positionId: string;
  studentId: string;
  status: string;
  appliedAt: string;
  firstName?: string;
  lastName?: string;
  major?: string | null;
  gpa?: number | null;
  positionTitle?: string;
}

const statusStyles: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  pending: { bg: '#fff8e1', color: '#b35c00', label: 'Pending' },
  reviewing: { bg: '#e8eaf6', color: '#3451b2', label: 'Reviewed' },
  accepted: { bg: '#d3f9d8', color: '#2b8a3e', label: 'Accepted' },
  rejected: { bg: '#ffe0e0', color: '#c62828', label: 'Rejected' },
  withdrawn: { bg: '#eceef5', color: '#6b7194', label: 'Withdrawn' },
};

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const now = new Date();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  if (diff < 0) return 'Closed';
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day left';
  return `${diff} days left`;
}

function formatAppliedAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function initials(first?: string, last?: string): string {
  const a = (first?.[0] || '').toUpperCase();
  const b = (last?.[0] || '').toUpperCase();
  return (a + b) || '?';
}

export function PIDashboard() {
  const [piProfile, setPiProfile] = useState<PIProfile | null>(null);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [allApplications, setAllApplications] = useState<AppWithMeta[]>([]);
  const [recentApps, setRecentApps] = useState<AppWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profile, posList] = await Promise.all([api.pis.getProfile(), api.positions.mine()]);
        if (cancelled) return;
        setPiProfile(profile);
        setPositions(posList);

        const nested = await Promise.all(
          posList.map((p) => api.applications.byPosition(p.id).catch(() => [] as AppWithMeta[]))
        );
        if (cancelled) return;

        const flat: AppWithMeta[] = nested.flatMap((apps, i) =>
          apps.map((a) => ({
            ...a,
            positionTitle: posList[i]?.title,
          }))
        );
        flat.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
        setAllApplications(flat);
        setRecentApps(flat.slice(0, 5));
      } catch {
        if (!cancelled) {
          setPositions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = async (id: string) => {
    await api.positions.close(id);
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, isOpen: false, status: 'closed' } : p)));
    setConfirmCloseId(null);
  };

  const openPositions = useMemo(() => positions.filter((p) => p.isOpen), [positions]);
  const totalApplicants = useMemo(
    () => positions.reduce((acc, p) => acc + (p.appCount || 0), 0),
    [positions]
  );
  const pendingTotal = useMemo(
    () => allApplications.filter((a) => a.status === 'pending').length,
    [allApplications]
  );

  const acceptanceRate = useMemo(() => {
    if (!allApplications.length) return null;
    const accepted = allApplications.filter((a) => a.status === 'accepted').length;
    return Math.round((accepted / allApplications.length) * 100);
  }, [allApplications]);

  const pendingByPosition = useMemo(() => {
    const m = new Map<string, number>();
    allApplications.forEach((a) => {
      if (a.status === 'pending') {
        m.set(a.positionId, (m.get(a.positionId) || 0) + 1);
      }
    });
    return m;
  }, [allApplications]);

  const labSubtitle = [piProfile?.labName, piProfile?.department].filter(Boolean).join(' · ');

  return (
    <div className="pi-dash-page">
      <Navbar />
      <main className="pi-dash-main">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-200 rounded-[10px]" />
              ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-[10px]" />
          </div>
        ) : (
          <>
            <div className="pi-dash-header">
              <div>
                <h1 className="pi-dash-title">Dashboard</h1>
                <p className="pi-dash-subtitle">{labSubtitle || 'Your lab overview'}</p>
              </div>
              <Link to="/pi/positions/new" className="pi-dash-btn-primary">
                <Plus size={14} strokeWidth={2.5} />
                New Position
              </Link>
            </div>

            <div className="pi-dash-stats">
              <div className="pi-dash-stat">
                <div className="pi-dash-stat-label">Open Positions</div>
                <div className="pi-dash-stat-row">
                  <div className="pi-dash-stat-value">{openPositions.length}</div>
                </div>
                <div className="pi-dash-stat-sub">{positions.length} total created</div>
              </div>
              <div className="pi-dash-stat">
                <div className="pi-dash-stat-label">Total Applicants</div>
                <div className="pi-dash-stat-row">
                  <div className="pi-dash-stat-value">{totalApplicants}</div>
                  {pendingTotal > 0 && <div className="pi-dash-stat-delta">+{pendingTotal} new</div>}
                </div>
                <div className="pi-dash-stat-sub">Across all positions</div>
              </div>
              <div className="pi-dash-stat">
                <div className="pi-dash-stat-label">Acceptance Rate</div>
                <div className="pi-dash-stat-row">
                  <div className="pi-dash-stat-value">
                    {acceptanceRate != null ? `${acceptanceRate}%` : 'N/A'}
                  </div>
                </div>
                <div className="pi-dash-stat-sub">
                  {allApplications.length
                    ? `${allApplications.filter((a) => a.status === 'accepted').length} of ${allApplications.length} applicants`
                    : 'No applications yet'}
                </div>
              </div>
              <div className="pi-dash-stat">
                <div className="pi-dash-stat-label">Avg. Time to Fill</div>
                <div className="pi-dash-stat-row">
                  <div className="pi-dash-stat-value">N/A</div>
                </div>
                <div className="pi-dash-stat-sub">From post to accept</div>
              </div>
            </div>

            <div className="pi-dash-grid" id="pi-positions">
              <div className="pi-dash-card">
                <div className="pi-dash-card-header">
                  <div className="pi-dash-card-title">My Positions</div>
                  <a href="#pi-positions" className="pi-dash-card-link">
                    View all →
                  </a>
                </div>
                {positions.length === 0 ? (
                  <div className="pi-dash-empty">
                    <svg className="pi-dash-empty-icon block mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 7h-9M14 17H5M14 7l-4 10M10 7h4" />
                    </svg>
                    <p className="pi-dash-empty-text">No positions yet.</p>
                    <Link to="/pi/positions/new" className="pi-dash-empty-cta">
                      Create your first position
                    </Link>
                  </div>
                ) : (
                  positions.map((p) => {
                    const pendingN = pendingByPosition.get(p.id) || 0;
                    const skills = (p.requiredSkills || []).slice(0, 3).join(', ');
                    return (
                      <div
                        key={p.id}
                        className="flex items-stretch border-b border-[#eceef5] last:border-b-0"
                      >
                        <Link to={`/pi/positions/${p.id}/applications`} className="pi-dash-pos-row flex-1 min-w-0">
                          <div className={`pi-dash-pos-indicator ${p.isOpen ? 'open' : 'closed'}`} />
                          <div className="pi-dash-pos-info">
                            <div className="pi-dash-pos-title">{p.title}</div>
                            <div className="pi-dash-pos-meta">
                              <span>{p.isFunded ? 'Funded' : 'Volunteer'}</span>
                              {skills ? <span>{skills}</span> : null}
                              <span>{daysUntil(p.deadline)}</span>
                            </div>
                          </div>
                          <div className="pi-dash-pos-applicants">
                            <div className="pi-dash-pos-count">
                              {p.appCount ?? 0}
                              {pendingN > 0 ? <span className="pi-dash-pos-new">+{pendingN}</span> : null}
                            </div>
                            <div className="pi-dash-pos-count-label">applicants</div>
                          </div>
                        </Link>
                        {p.isOpen ? (
                          <div className="flex flex-col justify-center shrink-0 px-3 py-2 border-l border-[#eceef5] bg-[#fafbfd]">
                            {confirmCloseId !== p.id ? (
                              <button
                                type="button"
                                className="pi-dash-pos-close"
                                onClick={() => setConfirmCloseId(p.id)}
                              >
                                Close
                              </button>
                            ) : (
                              <div className="pi-dash-confirm flex flex-col gap-1 items-stretch">
                                <span className="text-[11px] text-[#b35c00]">Close?</span>
                                <button
                                  type="button"
                                  className="bg-amber-600 text-white border-0 rounded-md"
                                  onClick={() => handleClose(p.id)}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="bg-slate-100 text-slate-700 border-0 rounded-md mt-1"
                                  onClick={() => setConfirmCloseId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pi-dash-card">
                <div className="pi-dash-card-header">
                  <div className="pi-dash-card-title">Recent Applicants</div>
                  <Link to="/pi/students" className="pi-dash-card-link">
                    View all →
                  </Link>
                </div>
                {recentApps.length === 0 ? (
                  <div className="pi-dash-empty">
                    <p className="pi-dash-empty-text">No applications yet.</p>
                  </div>
                ) : (
                  recentApps.map((a) => {
                    const st = statusStyles[a.status] || statusStyles.pending;
                    const name = [a.firstName, a.lastName].filter(Boolean).join(' ') || 'Student';
                    const gpaStr = a.gpa != null ? `${Number(a.gpa).toFixed(1)} GPA` : '';
                    const majorStr = a.major || 'N/A';
                    return (
                      <Link key={a.id} to={`/pi/students/${a.studentId}`} className="pi-dash-app-row">
                        <div className="pi-dash-app-avatar">{initials(a.firstName, a.lastName)}</div>
                        <div className="pi-dash-app-info">
                          <div className="pi-dash-app-name">{name}</div>
                          <div className="pi-dash-app-detail">
                            {majorStr}
                            {gpaStr ? ` · ${gpaStr}` : ''}
                          </div>
                        </div>
                        <div className="pi-dash-app-right">
                          <span className="pi-dash-app-status" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          <div className="pi-dash-app-time">{formatAppliedAgo(a.appliedAt)}</div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

          </>
        )}
      </main>
    </div>
  );
}
