import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api, ApiError } from '../../lib/api';
import type { Application, Position, QuestionAnswersMap } from '../../types';
import type { ApplicationQuestion } from '../../types/applicationQuestions';
import './position-detail.css';

function formatDeadlineLong(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function deadlineCountdown(iso: string | null): { kind: 'ok' | 'closed' | 'none'; daysText: string } {
  if (!iso) return { kind: 'none', daysText: '' };
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return { kind: 'none', daysText: '' };
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000);
  if (diffDays < 0) return { kind: 'closed', daysText: 'Closed' };
  if (diffDays === 0) return { kind: 'ok', daysText: '(Today)' };
  return { kind: 'ok', daysText: `(${diffDays} days left)` };
}

function buildAnswersPayload(
  questions: ApplicationQuestion[],
  raw: Record<string, string>
): QuestionAnswersMap {
  const out: QuestionAnswersMap = {};
  for (const q of questions) {
    const v = raw[q.id];
    if (v === undefined || String(v).trim() === '') continue;
    if (q.type === 'number') {
      const n = Number(String(v).trim());
      if (!Number.isNaN(n)) out[q.id] = n;
    } else {
      out[q.id] = String(v).trim();
    }
  }
  return out;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'pd-status pd-status-pending';
    case 'reviewing':
      return 'pd-status pd-status-reviewing';
    case 'accepted':
      return 'pd-status pd-status-accepted';
    case 'rejected':
      return 'pd-status pd-status-rejected';
    case 'withdrawn':
      return 'pd-status pd-status-withdrawn';
    default:
      return 'pd-status pd-status-pending';
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    reviewing: 'Reviewing',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };
  return labels[status] ?? status;
}

export function PositionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [position, setPosition] = useState<Position | null>(null);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [appsLoading, setAppsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setExistingApp(null);
    setAppsLoading(true);
    setLoading(true);
    Promise.all([
      api.positions.getById(id).catch(() => null),
      api.applications.mine().catch(() => [] as Application[]),
    ])
      .then(([pos, apps]) => {
        setPosition(pos);
        const found = apps.find((a) => a.positionId === id) ?? null;
        setExistingApp(found);
      })
      .finally(() => {
        setLoading(false);
        setAppsLoading(false);
      });
  }, [id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !position) return;
    const questions = (position.applicationQuestions || []).filter((q) => q.label?.trim());
    setError('');
    for (const q of questions) {
      if (!q.required) continue;
      const v = answerDraft[q.id];
      if (v === undefined || String(v).trim() === '') {
        setError(`Please answer: ${q.label}`);
        return;
      }
    }
    setApplying(true);
    try {
      const questionAnswers = buildAnswersPayload(questions, answerDraft);
      await api.applications.create({
        positionId: id,
        coverLetter: coverLetter || undefined,
        questionAnswers: Object.keys(questionAnswers).length ? questionAnswers : undefined,
      });
      navigate('/student/applications');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409 ? 'You have already applied to this position.' : err.message);
      } else {
        setError('Failed to apply');
      }
    } finally {
      setApplying(false);
    }
  };

  const piDisplay =
    position?.piFirstName || position?.piLastName
      ? `Dr. ${[position.piFirstName, position.piLastName].filter(Boolean).join(' ')}`
      : null;

  if (loading) {
    return (
      <div className="pd-page">
        <Navbar />
        <div className="pd-inner">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-slate-200 rounded w-40" />
            <div className="h-64 bg-slate-200 rounded-[10px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="pd-page">
        <Navbar />
        <div className="pd-inner">
          <p className="text-[#3d4260]">Position not found.</p>
          <Link to="/student/positions" className="pd-back mt-2">
            ← Back to positions
          </Link>
        </div>
      </div>
    );
  }

  const deadlineLong = formatDeadlineLong(position.deadline);
  const countdown = deadlineCountdown(position.deadline);
  const customQuestions = (position.applicationQuestions || []).filter((q) => q.label?.trim());
  const submitted = !!existingApp;

  return (
    <div className="pd-page">
      <Navbar />
      <div className="pd-inner">
        <Link to="/student/positions" className="pd-back">
          ← Back to positions
        </Link>

        <div className="pd-card">
          <div className="pd-header-row">
            <h1 className="pd-title">{position.title}</h1>
            {position.isFunded ? <span className="pd-badge-funded">Funded</span> : null}
          </div>

          {(position.labName || piDisplay) && (
            <div className="pd-lab-row">
              <FlaskConical size={16} strokeWidth={2} aria-hidden />
              <span>
                {position.labName || 'Research lab'}
                {piDisplay ? ` · ${piDisplay}` : ''}
              </span>
            </div>
          )}

          {position.department ? (
            <p className={`pd-dept ${position.labName || piDisplay ? 'pd-dept--indented' : ''}`}>{position.department}</p>
          ) : null}

          <hr className="pd-divider" />

          <div>
            <h2 className="pd-section-label">About This Position</h2>
            <p className="pd-desc-body">{position.description || 'No description provided.'}</p>
          </div>

          <hr className="pd-divider" />

          <div className="pd-req-row">
            <div>
              <h3 className="pd-req-label">Required Skills</h3>
              <div className="pd-skill-chips">
                {position.requiredSkills?.length ? (
                  position.requiredSkills.map((s) => (
                    <span key={s} className="pd-skill-chip">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#8b90ad]">None specified</span>
                )}
              </div>
            </div>
            <div className="pd-meta-block">
              <div>
                <h3 className="pd-req-label">Minimum GPA</h3>
                {position.minGpa != null ? (
                  <div className="pd-min-gpa-val">{position.minGpa}</div>
                ) : (
                  <span className="text-sm text-[#8b90ad]">Not specified</span>
                )}
              </div>
              <div>
                <h3 className="pd-req-label">Deadline</h3>
                {deadlineLong ? (
                  <>
                    <div className="pd-deadline-line">
                      <strong>{deadlineLong}</strong>
                    </div>
                    {countdown.kind === 'closed' ? (
                      <div className="pd-countdown-closed">{countdown.daysText}</div>
                    ) : countdown.kind === 'ok' ? (
                      <div className="pd-countdown-ok">{countdown.daysText}</div>
                    ) : null}
                  </>
                ) : (
                  <span className="text-sm text-[#8b90ad]">No deadline</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pd-card">
          <h2 className="pd-apply-title">
            {submitted ? 'Your application' : 'Apply for This Position'}
          </h2>
          {appsLoading ? (
            <p className="text-sm text-[#8b90ad]">Loading application status…</p>
          ) : submitted && existingApp ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[#3d4260]">Status:</span>
                <span className={statusBadgeClass(existingApp.status)}>{statusLabel(existingApp.status)}</span>
                <span className="text-sm text-[#8b90ad]">
                  Submitted{' '}
                  {new Date(existingApp.appliedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-[#5c617a]">
                You cannot edit a submitted application. This page is for your records only.
              </p>
              {existingApp.coverLetter?.trim() ? (
                <div>
                  <h3 className="pd-label">Cover letter</h3>
                  <p className="pd-desc-body whitespace-pre-wrap">{existingApp.coverLetter}</p>
                </div>
              ) : null}
              {customQuestions.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="pd-label">Your answers</h3>
                  {customQuestions.map((q) => {
                    const ans = existingApp.questionAnswers?.[q.id];
                    const display =
                      ans === undefined || ans === null ? 'No answer' : String(ans);
                    return (
                      <div key={q.id}>
                        <p className="text-sm font-medium text-[#3d4260]">{q.label}</p>
                        <p className="pd-desc-body whitespace-pre-wrap">{display}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : !position.isOpen ? (
            <p className="pd-closed-msg">This position is no longer accepting applications.</p>
          ) : (
            <form onSubmit={handleApply}>
              {error ? <div className="pd-error">{error}</div> : null}
              <label className="pd-label" htmlFor="pd-cover-letter">
                Cover Letter (optional)
              </label>
              <textarea
                id="pd-cover-letter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Why are you interested in this position? Mention relevant coursework or experience..."
                className="pd-textarea"
              />
              {customQuestions.map((q) => (
                <div key={q.id} className="mt-4">
                  <label className="pd-label" htmlFor={`pd-q-${q.id}`}>
                    {q.label}
                    {q.required ? ' *' : ''}
                  </label>
                  {q.type === 'text' && (
                    <textarea
                      id={`pd-q-${q.id}`}
                      value={answerDraft[q.id] ?? ''}
                      onChange={(e) =>
                        setAnswerDraft((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      className="pd-textarea"
                      rows={3}
                    />
                  )}
                  {q.type === 'number' && (
                    <input
                      id={`pd-q-${q.id}`}
                      type="number"
                      step="any"
                      value={answerDraft[q.id] ?? ''}
                      onChange={(e) =>
                        setAnswerDraft((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      className="pd-textarea py-2"
                    />
                  )}
                  {q.type === 'dropdown' && (
                    <select
                      id={`pd-q-${q.id}`}
                      value={answerDraft[q.id] ?? ''}
                      onChange={(e) =>
                        setAnswerDraft((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      className="pd-textarea py-2"
                    >
                      <option value="">Select…</option>
                      {(q.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                  {q.type === 'choice' && (
                    <fieldset id={`pd-q-${q.id}`} className="pd-choice-group">
                      <legend className="sr-only">{q.label}</legend>
                      {(q.options || []).map((opt) => (
                        <label key={opt} className="pd-choice-row">
                          <input
                            type="radio"
                            name={`pd-q-${q.id}`}
                            value={opt}
                            checked={(answerDraft[q.id] ?? '') === opt}
                            onChange={() => setAnswerDraft((d) => ({ ...d, [q.id]: opt }))}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </div>
              ))}
              <button type="submit" className="pd-submit" disabled={applying}>
                {applying ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
