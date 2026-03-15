import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { Position, StudentProfile } from '../../types';
import './student-dashboard.css';

interface AppRow {
  id: string;
  positionId: string;
  positionTitle?: string;
  labName?: string;
  status: string;
  appliedAt: string;
}

function computeProfileCompleteness(p: StudentProfile | null): number {
  if (!p) return 0;
  const total = 7;
  let n = 0;
  if (p.major?.trim()) n++;
  if (p.gpa != null) n++;
  if (p.yearLevel) n++;
  if (p.graduationYear != null) n++;
  if (p.skills?.length) n++;
  const bio = p.bio?.trim().toLowerCase();
  if (bio && bio !== 'hello') n++;
  if (p.resumeUrl?.trim()) n++;
  return Math.round((n / total) * 100);
}

function dotClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'sd-dot sd-dot-pending';
    case 'reviewing':
      return 'sd-dot sd-dot-reviewing';
    case 'accepted':
      return 'sd-dot sd-dot-accepted';
    case 'rejected':
      return 'sd-dot sd-dot-rejected';
    case 'withdrawn':
      return 'sd-dot sd-dot-withdrawn';
    default:
      return 'sd-dot sd-dot-pending';
  }
}

function badgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'sd-badge-inner sd-badge-pending';
    case 'reviewing':
      return 'sd-badge-inner sd-badge-reviewing';
    case 'accepted':
      return 'sd-badge-inner sd-badge-accepted';
    case 'rejected':
      return 'sd-badge-inner sd-badge-rejected';
    case 'withdrawn':
      return 'sd-badge-inner sd-badge-withdrawn';
    default:
      return 'sd-badge-inner sd-badge-pending';
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

/** API may return string[] or a single string; iterating a string would split into characters. */
function normalizeRequiredSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(/[,;]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [recommended, setRecommended] = useState<Position[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.students.getProfile(),
      api.applications.mine(),
      api.positions.list(),
      api.positions.recommended().catch(() => [] as Position[]),
    ])
      .then(([prof, apps, positions, recs]) => {
        setProfile(prof);
        setApplications(apps as AppRow[]);
        setOpenCount((positions as Position[]).length);
        setRecommended(recs as Position[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayName = useMemo(() => {
    if (user) {
      const n = [user.firstName, user.lastName].filter(Boolean).join(' ');
      if (n) return n;
    }
    const fromProfile = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
    return fromProfile || 'Student';
  }, [user, profile]);

  const submitted = applications.length;
  const pending = applications.filter((a) => a.status === 'pending').length;
  const accepted = applications.filter((a) => a.status === 'accepted').length;
  const acceptanceRate =
    submitted > 0 ? Math.round((accepted / submitted) * 100) : 0;
  const completeness = computeProfileCompleteness(profile);
  const profileComplete = completeness >= 100;

  const recent = applications.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="sd-page">
          <div className="sd-inner">
            <div className="animate-pulse space-y-4">
              <div className="h-7 bg-slate-200 rounded w-48" />
              <div className="h-4 bg-slate-200 rounded w-64" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-slate-200 rounded-[10px]" />
                ))}
              </div>
              <div className="h-64 bg-slate-200 rounded-[10px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="sd-page">
        <div className="sd-inner">
          <h1 className="sd-title">Dashboard</h1>
          <p className="sd-subtitle">Welcome back, {displayName}</p>

          <div className="sd-stats">
            <div className="sd-stat-card">
              <p className="sd-stat-num">{submitted}</p>
              <p className="sd-stat-label">Applications</p>
              <p className="sd-stat-sub sd-stat-sub-amber">{pending} pending</p>
            </div>
            <div className="sd-stat-card">
              <p className="sd-stat-num">{accepted}</p>
              <p className="sd-stat-label">Accepted</p>
              <p className="sd-stat-sub sd-stat-sub-green">{acceptanceRate}% rate</p>
            </div>
            <div className="sd-stat-card">
              <p className="sd-stat-num">{completeness}%</p>
              <p className="sd-stat-label">Profile Complete</p>
              {profileComplete ? (
                <p className="sd-stat-sub sd-stat-sub-green">Complete ✓</p>
              ) : (
                <Link to="/student/profile" className="sd-stat-link">
                  Add skills and bio
                </Link>
              )}
            </div>
            <div className="sd-stat-card">
              <p className="sd-stat-num">{openCount}</p>
              <p className="sd-stat-label">Open Positions</p>
              <Link to="/student/positions" className="sd-stat-link">
                Browse now →
              </Link>
            </div>
          </div>

          {recommended.length > 0 ? (
            <section className="sd-rec-block" aria-label="Recommended positions">
              <div className="sd-card">
                <div className="sd-card-head">
                  <h2 className="sd-card-head-title">Recommended Positions</h2>
                  <Link to="/student/positions" className="sd-card-head-link">
                    Browse all →
                  </Link>
                </div>
                {recommended.map((pos) => {
                  const skills = normalizeRequiredSkills(pos.requiredSkills);
                  const show = skills.slice(0, 4);
                  const rest = skills.length - show.length;
                  return (
                    <Link
                      key={pos.id}
                      to={`/student/positions/${pos.id}`}
                      className="sd-rec-row"
                    >
                      <div className="sd-rec-main">
                        <p className="sd-rec-title">{pos.title}</p>
                        {pos.labName?.trim() ? (
                          <p className="sd-rec-lab">{pos.labName}</p>
                        ) : null}
                        {show.length > 0 ? (
                          <div className="sd-rec-skills">
                            {show.map((skill, i) => (
                              <span key={`${pos.id}-${i}-${skill}`} className="sd-rec-skill">
                                {skill}
                              </span>
                            ))}
                            {rest > 0 ? (
                              <span className="sd-rec-more">+{rest} more</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="sd-rec-aside">
                        {pos.minGpa != null ? (
                          <p className="sd-rec-gpa">Min GPA: {pos.minGpa}</p>
                        ) : null}
                        <span className="sd-rec-view">View →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="sd-two-col">
            <div className="sd-card">
              {recent.length > 0 ? (
                <>
                  <div className="sd-card-head">
                    <h2 className="sd-card-head-title">Recent Applications</h2>
                    <Link to="/student/applications" className="sd-card-head-link">
                      View all →
                    </Link>
                  </div>
                  {recent.map((app) => (
                    <Link
                      key={app.id}
                      to={`/student/positions/${app.positionId}`}
                      className="sd-app-row"
                    >
                      <span className={dotClass(app.status)} aria-hidden />
                      <div className="sd-app-mid">
                        <p className="sd-app-title">{app.positionTitle || 'Position'}</p>
                        {app.labName?.trim() ? (
                          <p className="sd-app-lab">{app.labName}</p>
                        ) : null}
                      </div>
                      <div className="sd-badge">
                        <span className={badgeClass(app.status)}>{badgeLabel(app.status)}</span>
                      </div>
                    </Link>
                  ))}
                </>
              ) : (
                <div className="sd-empty-apps">
                  <p className="sd-empty-apps-text">No applications yet</p>
                  <Link to="/student/positions" className="sd-empty-apps-link">
                    Browse Positions →
                  </Link>
                </div>
              )}
            </div>

            <div className="sd-card">
              <div className="sd-card-head-only">
                <h2 className="sd-card-head-title">Quick Actions</h2>
              </div>
              <Link
                to="/student/profile"
                className={profileComplete ? 'sd-qa-row' : 'sd-qa-row sd-qa-highlight'}
              >
                {profileComplete ? (
                  <svg className="sd-qa-icon sd-qa-icon-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg className="sd-qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
                <span className={profileComplete ? 'sd-qa-label sd-qa-label-muted' : 'sd-qa-label'}>
                  Complete Your Profile
                </span>
                <span className="sd-qa-arrow">→</span>
              </Link>
              <Link to="/student/positions" className="sd-qa-row">
                <svg className="sd-qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <span className="sd-qa-label">Browse Open Positions</span>
                <span className="sd-qa-arrow">→</span>
              </Link>
              <Link to="/student/applications" className="sd-qa-row">
                <svg className="sd-qa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                <span className="sd-qa-label">View My Applications</span>
                <span className="sd-qa-arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
