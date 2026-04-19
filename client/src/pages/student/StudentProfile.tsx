import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { AcademicLevel } from '../../types';

const YEAR_LEVELS: AcademicLevel[] = ['freshman', 'sophomore', 'junior', 'senior', 'grad', 'masters', 'phd', 'postdoc'];

export function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    major: '',
    gpa: '',
    graduationYear: '',
    skills: '',
    bio: '',
    resumeUrl: '',
    yearLevel: '' as AcademicLevel | '',
  });

  useEffect(() => {
    api.students
      .getProfile()
      .then((p) => {
        setForm({
          major: p.major || '',
          gpa: p.gpa?.toString() || '',
          graduationYear: p.graduationYear?.toString() || '',
          skills: (p.skills || []).join(', '),
          bio: p.bio || '',
          resumeUrl: p.resumeUrl || '',
          yearLevel: p.yearLevel || '',
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
      const skills = form.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.students.updateProfile({
        major: form.major || null,
        gpa: form.gpa ? parseFloat(form.gpa) : null,
        graduationYear: form.graduationYear ? parseInt(form.graduationYear, 10) : null,
        skills,
        bio: form.bio || null,
        resumeUrl: form.resumeUrl || null,
        yearLevel: form.yearLevel || null,
      });
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large (max 5MB)');
      return;
    }
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      return;
    }
    setUploadError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('resume', file);
    try {
      const data = await (await fetch('/api/students/resume', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd,
      })).json();
      if (data.resumeUrl) {
        setForm((f) => ({ ...f, resumeUrl: data.resumeUrl }));
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch {
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveResume = async () => {
    try {
      await fetch('/api/students/resume', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setForm((f) => ({ ...f, resumeUrl: '' }));
    } catch {
      setError('Failed to remove resume');
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
        <h1 className="text-2xl font-bold text-inherit mb-6">Edit Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Major</label>
            <input
              type="text"
              value={form.major}
              onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-inherit mb-1">GPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.gpa}
                onChange={(e) => setForm((f) => ({ ...f, gpa: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-inherit mb-1">Graduation Year</label>
              <input
                type="number"
                value={form.graduationYear}
                onChange={(e) => setForm((f) => ({ ...f, graduationYear: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Year Level</label>
            <select
              value={form.yearLevel}
              onChange={(e) => setForm((f) => ({ ...f, yearLevel: e.target.value as AcademicLevel }))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select</option>
              {YEAR_LEVELS.map((yl) => (
                <option key={yl} value={yl}>
                  {yl.charAt(0).toUpperCase() + yl.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              value={form.skills}
              onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
              placeholder="e.g. Python, MATLAB, data analysis"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-inherit mb-1">Resume (PDF, max 5MB)</label>
            {form.resumeUrl ? (
              <div className="flex items-center gap-3">
                <a
                  href={form.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200 transition-colors"
                >
                  View Uploaded Resume
                </a>
                <button
                  type="button"
                  onClick={handleRemoveResume}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-teal-500 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-sm text-slate-500">{uploading ? 'Uploading...' : 'Click to upload PDF'}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
            {uploadError && (
              <p className="mt-1 text-sm text-red-600">{uploadError}</p>
            )}
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
