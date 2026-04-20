import { useEffect, useState } from 'react';
import { Building2, Link2, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { LabAdminOption } from '../../types';

export function PIProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [labs, setLabs] = useState<LabAdminOption[]>([]);

  const [form, setForm] = useState({
    department: '',
    labName: '',
    researchArea: '',
    labWebsite: '',
    labAdminId: '' as string | null,
  });

  useEffect(() => {
    Promise.all([api.pis.getProfile(), api.pis.listLabs()])
      .then(([profile, labList]) => {
        setForm({
          department: profile.department || '',
          labName: profile.labName || '',
          researchArea: profile.researchArea || '',
          labWebsite: profile.labWebsite || '',
          labAdminId: profile.labAdminId ?? null,
        });
        setLabs(labList);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      await api.pis.updateProfile({
        department: form.department || null,
        labName: form.labName || null,
        researchArea: form.researchArea || null,
        labWebsite: form.labWebsite || null,
        labAdminId: form.labAdminId || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const selectedLab = labs.find((l) => l.id === form.labAdminId);

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
        <h1 className="text-2xl font-bold text-foreground mb-6">Lab Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">{error}</div>
          )}
          {saved && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 size={16} /> Profile saved successfully.
            </div>
          )}

          {/* Lab association */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={18} className="text-teal-600" />
              <h2 className="font-semibold text-foreground">Lab Association</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Associate yourself with a lab administrator. They will be able to view your positions and students in their lab dashboard.
            </p>
            {labs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No lab administrators are registered yet.</p>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Select lab administrator
                </label>
                <select
                  value={form.labAdminId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, labAdminId: e.target.value || null }))}
                  className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
                >
                  <option value="">Not associated with a lab</option>
                  {labs.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.displayName} ({lab.email})
                    </option>
                  ))}
                </select>
                {selectedLab && (
                  <p className="text-xs text-teal-600 flex items-center gap-1 mt-1">
                    <Link2 size={12} />
                    Currently associated with: <strong>{selectedLab.displayName}</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lab details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Lab Name</label>
              <input
                type="text"
                value={form.labName}
                onChange={(e) => setForm((f) => ({ ...f, labName: e.target.value }))}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Research Area</label>
              <textarea
                value={form.researchArea}
                onChange={(e) => setForm((f) => ({ ...f, researchArea: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Lab Website</label>
              <input
                type="url"
                value={form.labWebsite}
                onChange={(e) => setForm((f) => ({ ...f, labWebsite: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
              />
            </div>
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
