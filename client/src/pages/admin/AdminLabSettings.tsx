import { useCallback, useEffect, useState } from 'react';
import { Building2, Globe, Save, FlaskConical } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function AdminLabSettings() {
  const { loading: authLoading } = useAuth();

  const [department, setDepartment] = useState('');
  const [labName, setLabName] = useState('');
  const [labWebsite, setLabWebsite] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.admin.getLab();
      setDepartment(data.department ?? '');
      setLabName(data.labName ?? '');
      setLabWebsite(data.labWebsite ?? '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load lab settings (${msg}).`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) { load(); }
  }, [authLoading, load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.admin.updateLab({ department, labName, labWebsite });
      setSuccess('Lab settings updated. All associated PIs will now show these values on their profiles.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to save (${msg}).`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8" style={{ marginLeft: '14rem' }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Lab Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set shared lab information for all PIs in your lab. Changes apply to every PI
            who has associated with your account.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : (
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <FlaskConical size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Shared Lab Information</p>
                <p className="text-xs text-muted-foreground">
                  These values are applied to all PIs associated with your lab and cannot
                  be individually changed by them.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Department
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Lab Name
              </label>
              <div className="relative">
                <FlaskConical
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  placeholder="e.g. Computational Biology Lab"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">
                Lab Website
              </label>
              <div className="relative">
                <Globe
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="url"
                  value={labWebsite}
                  onChange={(e) => setLabWebsite(e.target.value)}
                  placeholder="https://lab.university.edu"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <p className="text-xs text-muted-foreground pl-1">
                Include https:// for a valid link.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
