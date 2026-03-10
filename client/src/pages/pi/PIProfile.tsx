import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';

export function PIProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    department: '',
    labName: '',
    researchArea: '',
    labWebsite: '',
  });

  useEffect(() => {
    api.pis
      .getProfile()
      .then((p) => {
        setForm({
          department: p.department || '',
          labName: p.labName || '',
          researchArea: p.researchArea || '',
          labWebsite: p.labWebsite || '',
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.pis.updateProfile({
        department: form.department || null,
        labName: form.labName || null,
        researchArea: form.researchArea || null,
        labWebsite: form.labWebsite || null,
      });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse h-8 bg-slate-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-6">Lab Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Lab Name</label>
            <input
              type="text"
              value={form.labName}
              onChange={(e) => setForm((f) => ({ ...f, labName: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Research Area</label>
            <textarea
              value={form.researchArea}
              onChange={(e) => setForm((f) => ({ ...f, researchArea: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Lab Website</label>
            <input
              type="url"
              value={form.labWebsite}
              onChange={(e) => setForm((f) => ({ ...f, labWebsite: e.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
