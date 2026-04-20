import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Modal } from '../../components/Modal';
import { api } from '../../lib/api';
import type { AcademicLevel, Position } from '../../types';
import './position-applications.css';

interface AppWithStudent {
  id: string;
  studentId: string;
  studentUserId?: string;
  status: string;
  coverLetter: string | null;
  appliedAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  major?: string;
  gpa?: number;
  skills?: string[];
  bio?: string;
  resumeUrl?: string;
  yearLevel?: string;
  questionAnswers?: Record<string, string | number>;
}

function initials(first?: string, last?: string): string {
  const a = (first?.[0] || '').toUpperCase();
  const b = (last?.[0] || '').toUpperCase();
  return (a + b) || '?';
}

function formatYearLabel(yl: string | undefined): string {
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

function pillClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'pa-pill pa-pill-pending';
    case 'reviewing':
      return 'pa-pill pa-pill-reviewing';
    case 'accepted':
      return 'pa-pill pa-pill-accepted';
    case 'rejected':
      return 'pa-pill pa-pill-rejected';
    case 'withdrawn':
      return 'pa-pill pa-pill-withdrawn';
    default:
      return 'pa-pill pa-pill-pending';
  }
}

function pillLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    reviewing: 'Reviewing',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status] ?? status;
}

export function PositionApplications() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<AppWithStudent[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppWithStudent | null>(null);
  const [updating, setUpdating] = useState(false);
  const [messagingStudentId, setMessagingStudentId] = useState<string | null>(null);

  const handleMessageStudent = async (app: AppWithStudent) => {
    if (!app.studentUserId || messagingStudentId) return;
    setMessagingStudentId(app.id);
    try {
      const { conversationId } = await api.messages.findOrCreateConversation(app.studentUserId);
      navigate(`/pi/inbox/${conversationId}`);
    } catch {
      setMessagingStudentId(null);
    }
  };

  useEffect(() => {
    if (!id) return;
    api.positions.getById(id).then(setPosition).catch(() => setPosition(null));
    api.applications
      .byPosition(id)
      .then(setApplications)
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (appId: string, status: string) => {
    setUpdating(true);
    try {
      await api.applications.updateStatus(appId, status);
      setApplications((apps) => apps.map((a) => (a.id === appId ? { ...a, status } : a)));
      setSelectedApp((a) => (a?.id === appId ? { ...a, status } : a));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      {loading ? (
        <div className="pa-page">
          <div className="pa-inner">
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-40" />
              <div className="h-8 bg-slate-200 rounded w-3/4 max-w-md" />
              <div className="h-4 bg-slate-200 rounded w-24" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-200 rounded-[10px]" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="pa-page">
          <div className="pa-inner">
            <Link to="/pi/dashboard" className="pa-back">
              ← Back to dashboard
            </Link>
            <h1 className="pa-title">{position?.title || 'Position'}</h1>
            <p className="pa-subtitle">
              {applications.length} applicant{applications.length !== 1 ? 's' : ''}
            </p>

            {applications.length === 0 ? (
              <div className="pa-empty">
                <svg className="pa-empty-icon mx-auto block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
                </svg>
                <p className="pa-empty-title">No applications yet</p>
                <p className="pa-empty-sub">Applications will appear here when students apply</p>
              </div>
            ) : (
              <div className="pa-list">
                {applications.map((app) => {
                  const name = [app.firstName, app.lastName].filter(Boolean).join(' ') || 'Applicant';
                  const detailParts: string[] = [];
                  if (app.major) detailParts.push(app.major);
                  if (app.gpa != null) detailParts.push(`${Number(app.gpa).toFixed(1)} GPA`);
                  const yl = app.yearLevel as AcademicLevel | undefined;
                  if (yl) detailParts.push(formatYearLabel(yl));
                  const detailsLine = detailParts.join(' · ');
                  const letter = app.coverLetter?.trim();

                  return (
                    <div key={app.id} className="pa-card">
                      <div className="pa-avatar">{initials(app.firstName, app.lastName)}</div>
                      <div className="pa-info">
                        <p className="pa-name">{name}</p>
                        {detailsLine ? <p className="pa-details">{detailsLine}</p> : null}
                        {letter ? (
                          <div className="pa-cover-row">
                            <span className="pa-cover-text">{letter}</span>
                            <button
                              type="button"
                              className="pa-read-more"
                              onClick={() => setSelectedApp(app)}
                            >
                              Read more
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="pa-actions">
                        <span className={pillClass(app.status)}>{pillLabel(app.status)}</span>
                        <select
                          className="pa-select"
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          disabled={updating}
                          aria-label={`Status for ${name}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                          <option value="withdrawn">Withdrawn</option>
                        </select>
                        <Link to={`/pi/students/${app.studentId}`} className="pa-profile-link">
                          View Profile
                        </Link>
                        {app.studentUserId && (
                          <button
                            type="button"
                            onClick={() => { void handleMessageStudent(app); }}
                            disabled={!!messagingStudentId}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(0,82,204,0.35)',
                              background: 'rgba(0,82,204,0.06)',
                              color: '#0052CC',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: messagingStudentId ? 'not-allowed' : 'pointer',
                              opacity: messagingStudentId ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <MessageSquare size={13} strokeWidth={2} />
                            {messagingStudentId === app.id ? 'Opening…' : 'Message'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={selectedApp ? `${selectedApp.firstName || ''} ${selectedApp.lastName || ''}`.trim() : ''}
      >
        {selectedApp && (
          <div className="space-y-3 text-sm text-slate-200">
            <p>
              <strong className="text-slate-100">Email:</strong> {selectedApp.email}
            </p>
            {selectedApp.major && (
              <p>
                <strong className="text-slate-100">Major:</strong> {selectedApp.major}
              </p>
            )}
            {selectedApp.gpa != null && (
              <p>
                <strong className="text-slate-100">GPA:</strong> {selectedApp.gpa}
              </p>
            )}
            {selectedApp.yearLevel && (
              <p>
                <strong className="text-slate-100">Year:</strong> {formatYearLabel(selectedApp.yearLevel)}
              </p>
            )}
            {selectedApp.skills && selectedApp.skills.length > 0 && (
              <p>
                <strong className="text-slate-100">Skills:</strong> {selectedApp.skills.join(', ')}
              </p>
            )}
            {selectedApp.coverLetter && (
              <div>
                <strong className="text-slate-100">Cover letter:</strong>
                <p className="mt-1 whitespace-pre-wrap text-slate-300">{selectedApp.coverLetter}</p>
              </div>
            )}
            {selectedApp.questionAnswers &&
              Object.keys(selectedApp.questionAnswers).length > 0 &&
              (position?.applicationQuestions?.length ? (
                <div>
                  <strong className="text-slate-100">Application questions:</strong>
                  <ul className="mt-2 space-y-2 list-none pl-0">
                    {position.applicationQuestions.map((q) => {
                      const v = selectedApp.questionAnswers?.[q.id];
                      if (v === undefined || v === null) return null;
                      return (
                        <li key={q.id}>
                          <span className="text-slate-200 font-medium">{q.label}: </span>
                          <span className="text-slate-300 whitespace-pre-wrap">{String(v)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div>
                  <strong className="text-slate-100">Extra answers:</strong>
                  <pre className="mt-1 text-slate-300 text-xs whitespace-pre-wrap">
                    {JSON.stringify(selectedApp.questionAnswers, null, 2)}
                  </pre>
                </div>
              ))}
            <Link
              to={`/pi/students/${selectedApp.studentId}`}
              className="inline-block mt-2 text-blue-400 hover:underline"
            >
              View full profile →
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
