import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { ApplicationQuestionsEditor } from '../../components/ApplicationQuestionsEditor';
import { api } from '../../lib/api';
import type { Position } from '../../types';
import type { ApplicationQuestion } from '../../types/applicationQuestions';

export function PositionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    requiredSkills: '',
    minGpa: '',
    isOpen: true,
    isFunded: false,
    deadline: '',
  });

  useEffect(() => {
    if (!id) return;
    api.positions
      .getById(id)
      .then((p) => {
        setPosition(p);
        setApplicationQuestions(
          Array.isArray(p.applicationQuestions) ? (p.applicationQuestions as ApplicationQuestion[]) : []
        );
        setForm({
          title: p.title,
          description: p.description || '',
          requiredSkills: (p.requiredSkills || []).join(', '),
          minGpa: p.minGpa?.toString() || '',
          isOpen: p.isOpen,
          isFunded: p.isFunded,
          deadline: p.deadline || '',
        });
      })
      .catch(() => setPosition(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    setSaving(true);
    try {
      await api.positions.update(id, {
        title: form.title,
        description: form.description || undefined,
        requiredSkills: form.requiredSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        minGpa: form.minGpa ? parseFloat(form.minGpa) : undefined,
        isOpen: form.isOpen,
        isFunded: form.isFunded,
        deadline: form.deadline || undefined,
        applicationQuestions: applicationQuestions.filter((q) => q.label.trim()),
      });
      navigate('/pi/dashboard');
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      await api.positions.close(id);
      navigate('/pi/dashboard');
    } catch {
      setError('Failed to close position');
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
          <Link to="/pi/dashboard" className="text-teal-600 hover:underline mt-2 inline-block">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/pi/dashboard" className="text-teal-600 hover:underline mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-inherit mb-6">Edit Position</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Required Skills (comma-separated)</label>
            <input
              type="text"
              value={form.requiredSkills}
              onChange={(e) => setForm((f) => ({ ...f, requiredSkills: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-inherit mb-1">Min GPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.minGpa}
                onChange={(e) => setForm((f) => ({ ...f, minGpa: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-inherit mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isOpen"
              checked={form.isOpen}
              onChange={(e) => setForm((f) => ({ ...f, isOpen: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="isOpen" className="text-sm font-medium text-inherit">
              Accepting applications
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFunded"
              checked={form.isFunded}
              onChange={(e) => setForm((f) => ({ ...f, isFunded: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="isFunded" className="text-sm font-medium text-inherit">
              Funded position
            </label>
          </div>
          <ApplicationQuestionsEditor value={applicationQuestions} onChange={setApplicationQuestions} />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {form.isOpen && !confirmClose && (
              <button
                type="button"
                onClick={() => setConfirmClose(true)}
                className="px-6 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700"
              >
                Close Position
              </button>
            )}
            {confirmClose && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-sm text-amber-800">
                  Close this position? All pending applicants will be notified.
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClose(false)}
                  className="px-4 py-1.5 text-sm font-medium text-inherit hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
