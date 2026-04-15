import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api, ApiError } from '../../lib/api';
import type { Position } from '../../types';
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

export function PositionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.positions
      .getById(id)
      .then(setPosition)
      .catch(() => setPosition(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setApplying(true);
    try {
      await api.applications.create({ positionId: id, coverLetter: coverLetter || undefined });
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
            <p className="pd-desc-body">{position.description || '—'}</p>
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
          <h2 className="pd-apply-title">Apply for This Position</h2>
          {!position.isOpen ? (
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
