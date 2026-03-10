import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['Morning (8am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–9pm)'];
const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55+'];
const STUDY_TYPES = ['Survey / Questionnaire', 'Interview', 'Lab Study', 'Clinical Trial', 'Observational'];
const COMPENSATION = ['Course Credit', 'Monetary', 'Volunteer (no compensation)'];
const LOCATION_PREFS = ['Remote', 'In-Person', 'Either'];

function CheckGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt]);

  return (
    <div>
      <p className="text-sm font-medium text-inherit mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              selected.includes(opt)
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-inherit border-slate-300 hover:border-teal-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ParticipantProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    availableDays: [] as string[],
    availableTimes: [] as string[],
    hoursPerWeek: '',
    ageRange: '',
    gender: '',
    ethnicity: '',
    studyTypes: [] as string[],
    compensationPref: [] as string[],
    locationPref: '',
    notes: '',
  });

  useEffect(() => {
    api.participants
      .getProfile()
      .then((p) => {
        if (p) {
          setForm({
            availableDays: p.availableDays || [],
            availableTimes: p.availableTimes || [],
            hoursPerWeek: p.hoursPerWeek?.toString() || '',
            ageRange: p.ageRange || '',
            gender: p.gender || '',
            ethnicity: p.ethnicity || '',
            studyTypes: p.studyTypes || [],
            compensationPref: p.compensationPref || [],
            locationPref: p.locationPref || '',
            notes: p.notes || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await api.participants.updateProfile({
        availableDays: form.availableDays,
        availableTimes: form.availableTimes,
        hoursPerWeek: form.hoursPerWeek ? parseInt(form.hoursPerWeek, 10) : null,
        ageRange: form.ageRange || null,
        gender: form.gender || null,
        ethnicity: form.ethnicity || null,
        studyTypes: form.studyTypes,
        compensationPref: form.compensationPref,
        locationPref: form.locationPref || null,
        notes: form.notes || null,
      });
      setSaved(true);
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
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-32 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-1">Participant Profile</h1>
        <p className="text-sm text-inherit mb-6">
          Help researchers find you for studies that match your availability and preferences.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          {saved && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">Profile saved.</div>}

          {/* Availability */}
          <section>
            <h2 className="text-base font-semibold text-inherit mb-4 pb-2 border-b border-slate-200">
              Availability
            </h2>
            <div className="space-y-4">
              <CheckGroup
                label="Days available"
                options={DAYS}
                selected={form.availableDays}
                onChange={(v) => setForm((f) => ({ ...f, availableDays: v }))}
              />
              <CheckGroup
                label="Times available"
                options={TIMES}
                selected={form.availableTimes}
                onChange={(v) => setForm((f) => ({ ...f, availableTimes: v }))}
              />
              <div className="w-40">
                <label className="block text-sm font-medium text-inherit mb-1">
                  Hours available per week
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={form.hoursPerWeek}
                  onChange={(e) => setForm((f) => ({ ...f, hoursPerWeek: e.target.value }))}
                  placeholder="e.g. 5"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </section>

          {/* Demographics */}
          <section>
            <h2 className="text-base font-semibold text-inherit mb-4 pb-2 border-b border-slate-200">
              Demographics
              <span className="ml-2 text-xs font-normal text-slate-400">(optional — used for study eligibility)</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-inherit mb-2">Age range</label>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, ageRange: f.ageRange === r ? '' : r }))}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.ageRange === r
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-inherit border-slate-300 hover:border-teal-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-inherit mb-1">Gender identity</label>
                  <input
                    type="text"
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    placeholder="e.g. Woman, Non-binary…"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-inherit mb-1">Ethnicity</label>
                  <input
                    type="text"
                    value={form.ethnicity}
                    onChange={(e) => setForm((f) => ({ ...f, ethnicity: e.target.value }))}
                    placeholder="e.g. Hispanic, Asian…"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Participation Preferences */}
          <section>
            <h2 className="text-base font-semibold text-inherit mb-4 pb-2 border-b border-slate-200">
              Participation Preferences
            </h2>
            <div className="space-y-4">
              <CheckGroup
                label="Types of studies I'm open to"
                options={STUDY_TYPES}
                selected={form.studyTypes}
                onChange={(v) => setForm((f) => ({ ...f, studyTypes: v }))}
              />
              <CheckGroup
                label="Compensation preferences"
                options={COMPENSATION}
                selected={form.compensationPref}
                onChange={(v) => setForm((f) => ({ ...f, compensationPref: v }))}
              />
              <div>
                <label className="block text-sm font-medium text-inherit mb-2">Location preference</label>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_PREFS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, locationPref: f.locationPref === l ? '' : l }))}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.locationPref === l
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-inherit border-slate-300 hover:border-teal-400'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-inherit mb-1">
                  Additional notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any constraints, medical conditions relevant to eligibility, or other info for researchers…"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
