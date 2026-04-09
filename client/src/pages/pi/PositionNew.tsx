import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { ApplicationQuestionsEditor } from '../../components/ApplicationQuestionsEditor';
import { api } from '../../lib/api';
import type { ApplicationQuestion } from '../../types/applicationQuestions';

export function PositionNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    requiredSkills: '',
    minGpa: '',
    isFunded: false,
    deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const position = await api.positions.create({
        title: form.title.trim(),
        description: form.description || undefined,
        requiredSkills: form.requiredSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        minGpa: form.minGpa ? parseFloat(form.minGpa) : undefined,
        isFunded: form.isFunded,
        deadline: form.deadline || undefined,
        applicationQuestions: applicationQuestions.filter((q) => q.label.trim()),
      });
      navigate(`/pi/positions/${position.id}/edit`);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to create position');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/pi/dashboard" className="text-teal-600 hover:underline mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-inherit mb-6">Create Position</h1>
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
              placeholder="e.g. Python, MATLAB, data analysis"
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
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Position'}
          </button>
        </form>
      </div>
    </div>
  );
}
