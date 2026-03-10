import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { api, ApiError } from '../../lib/api';
import type { Position } from '../../types';

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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse h-8 bg-slate-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-inherit">Position not found.</p>
          <Link to="/student/positions" className="text-teal-600 hover:underline mt-2 inline-block">
            Back to positions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/student/positions" className="text-teal-600 hover:underline mb-4 inline-block">
          ← Back to positions
        </Link>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-inherit">{position.title}</h1>
          {position.labName && (
            <p className="text-teal-600 font-medium mt-1">{position.labName}</p>
          )}
          {position.department && (
            <p className="text-inherit text-sm">{position.department}</p>
          )}
          {position.description && (
            <div className="mt-4 text-inherit whitespace-pre-wrap">{position.description}</div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {position.requiredSkills?.map((s) => (
              <span
                key={s}
                className="px-2 py-1 bg-slate-100 text-inherit rounded text-sm"
              >
                {s}
              </span>
            ))}
            {position.minGpa && (
              <span className="px-2 py-1 bg-slate-100 text-inherit rounded text-sm">
                Min GPA: {position.minGpa}
              </span>
            )}
            {position.isFunded && (
              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-sm">
                Funded
              </span>
            )}
          </div>
          {position.deadline && (
            <p className="mt-4 text-sm text-inherit">Deadline: {position.deadline}</p>
          )}
          {!position.isOpen ? (
            <p className="mt-4 text-amber-600 font-medium">This position is no longer accepting applications.</p>
          ) : (
            <form onSubmit={handleApply} className="mt-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}
              <label className="block text-sm font-medium text-inherit mb-1">Cover letter (optional)</label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 mb-4"
              />
              <button
                type="submit"
                disabled={applying}
                className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
