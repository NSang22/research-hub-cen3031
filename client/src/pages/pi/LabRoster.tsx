import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { AcademicLevel, LabRosterMember } from '../../types';
import './student-browse.css';

function formatYearLabel(yl: AcademicLevel | null | undefined): string {
  if (!yl) return '';
  const map: Record<string, string> = {
    freshman: 'Freshman',
    sophomore: 'Sophomore',
    junior: 'Junior',
    senior: 'Senior',
    grad: 'Grad',
    masters: 'Masters',
    phd: 'PhD',
    postdoc: 'Postdoc',
  };
  return map[yl] || yl;
}

function initials(first?: string, last?: string): string {
  const a = (first?.[0] || '').toUpperCase();
  const b = (last?.[0] || '').toUpperCase();
  return a + b || '?';
}

function formatSince(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function LabRoster() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<LabRosterMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pis
      .getRoster()
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const openStudent = (id: string) => {
    navigate(`/pi/students/${id}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      {loading ? (
        <div className="bs-page">
          <div className="bs-container">
            <div className="animate-pulse space-y-4">
              <div className="h-9 bg-slate-200 rounded w-64" />
              <div className="h-36 bg-slate-200 rounded-xl" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200 rounded-[10px]" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bs-page">
          <div className="bs-container">
            <header className="bs-header">
              <h1 className="bs-title">Lab roster</h1>
              <p className="bs-subtitle">
                Students you have accepted for your research positions: your active lab members. For everyone on the
                platform, use{' '}
                <button
                  type="button"
                  className="bs-reset"
                  style={{ display: 'inline', padding: 0, textDecoration: 'underline' }}
                  onClick={() => navigate('/pi/students')}
                >
                  Students
                </button>{' '}
                under Account.
              </p>
            </header>

            <div className="bs-results-meta" style={{ marginBottom: 12 }}>
              {members.length} lab member{members.length !== 1 ? 's' : ''}
            </div>

            <div className="bs-cards">
              {members.length === 0 ? (
                <div className="bs-empty">
                  No one is on your lab roster yet. Accept applicants from your position pipelines; they will show up
                  here automatically.
                </div>
              ) : (
                members.map((s) => {
                  const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
                  const metaParts = [
                    s.major?.trim(),
                    formatYearLabel(s.yearLevel || undefined),
                    s.graduationYear != null ? `Class of ${s.graduationYear}` : '',
                  ].filter(Boolean);
                  const metaLine = metaParts.join(' · ');
                  const titles = (s.acceptedPositionTitles || []).filter(Boolean);

                  return (
                    <div
                      key={s.id}
                      className="bs-card"
                      role="link"
                      tabIndex={0}
                      onClick={() => openStudent(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openStudent(s.id);
                        }
                      }}
                    >
                      <div className="bs-roster-card-top">
                        <div className="bs-roster-avatar" aria-hidden>
                          {initials(s.firstName, s.lastName)}
                        </div>
                        <div className="bs-roster-head">
                          <div className="bs-card-top" style={{ marginBottom: 0 }}>
                            <div className="bs-card-name">{name}</div>
                            <div className="bs-card-gpa-wrap">
                              {s.gpa != null ? (
                                <>
                                  <span className="bs-card-gpa-label">GPA</span>
                                  <span className="bs-card-gpa-val">{Number(s.gpa).toFixed(2)}</span>
                                </>
                              ) : (
                                <span className="bs-card-gpa-empty">N/A</span>
                              )}
                            </div>
                          </div>
                          {titles.length > 0 ? (
                            <div className="bs-roster-positions">
                              <strong style={{ color: '#3d4260' }}>Positions: </strong>
                              {titles.join(', ')}
                            </div>
                          ) : null}
                          {s.inLabSince ? (
                            <div className="bs-roster-since">On roster since {formatSince(s.inLabSince)}</div>
                          ) : null}
                        </div>
                      </div>

                      {metaLine ? (
                        <div className="bs-meta-line" style={{ marginTop: 12 }}>
                          <GraduationCap size={16} strokeWidth={2} aria-hidden />
                          <span>{metaLine}</span>
                        </div>
                      ) : null}
                      {s.bio?.trim() ? <p className="bs-bio">{s.bio}</p> : null}
                      <div className="bs-footer" style={{ marginTop: 12 }}>
                        <div className="bs-chips">
                          {(s.skills || []).slice(0, 8).map((sk) => (
                            <span key={sk} className="bs-chip">
                              {sk}
                            </span>
                          ))}
                          {(s.skills || []).length > 8 ? (
                            <span className="bs-chip">+{s.skills!.length - 8} more</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bs-roster-actions" onClick={(e) => e.stopPropagation()}>
                        {s.email ? (
                          <a href={`mailto:${s.email}`} className="bs-email">
                            Email {s.firstName || 'student'}
                          </a>
                        ) : null}
                        <button type="button" className="bs-roster-link" onClick={() => openStudent(s.id)}>
                          View full profile →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
