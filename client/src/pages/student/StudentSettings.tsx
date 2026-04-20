import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { ApiError, api } from '../../lib/api';
import type { NotificationFrequency, NotificationPreferences } from '../../types';

// ---------------------------------------------------------------------------
// Local-only settings (browser prefs, no server storage)
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'rh-student-settings-';

type LocalSettings = {
  emailStatusUpdates: boolean;
  browserNotifications: boolean;
};

const LOCAL_DEFAULTS: LocalSettings = {
  emailStatusUpdates: true,
  browserNotifications: false,
};

function loadLocalSettings(): LocalSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}v1`);
    if (!raw) return { ...LOCAL_DEFAULTS };
    const p = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      emailStatusUpdates:
        typeof p.emailStatusUpdates === 'boolean' ? p.emailStatusUpdates : LOCAL_DEFAULTS.emailStatusUpdates,
      browserNotifications:
        typeof p.browserNotifications === 'boolean' ? p.browserNotifications : LOCAL_DEFAULTS.browserNotifications,
    };
  } catch {
    return { ...LOCAL_DEFAULTS };
  }
}

const MAX_KEYWORDS = 25;
const MAX_DEPARTMENTS = 15;
const MAX_TAG_LEN = 80;

const DEPARTMENT_SUGGESTIONS = [
  'Computer Science',
  'Psychology',
  'Biology',
  'Chemistry',
  'Physics',
  'Neuroscience',
  'Mathematics',
  'Engineering',
  'Public Health',
  'Economics',
];

// ---------------------------------------------------------------------------
// Tag-input helper
// ---------------------------------------------------------------------------

function TagInput({
  label,
  hint,
  values,
  placeholder,
  onChange,
  maxItems,
}: {
  label: string;
  hint: string;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
  maxItems: number;
}) {
  const [draft, setDraft] = useState('');
  const [hintMsg, setHintMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atMax = values.length >= maxItems;

  const add = () => {
    setHintMsg(null);
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (atMax) {
      setHintMsg(`You can add at most ${maxItems} entries.`);
      return;
    }
    if (trimmed.length > MAX_TAG_LEN) {
      setHintMsg(`Each entry must be at most ${MAX_TAG_LEN} characters.`);
      return;
    }
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setHintMsg('That value is already added.');
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  return (
    <div className="space-y-2">
      <span className="font-medium text-inherit block">{label}</span>
      <span className="text-sm text-slate-600 block">{hint}</span>
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 rounded-full text-sm border border-teal-200"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              className="text-teal-600 hover:text-teal-900 leading-none"
              onClick={() => remove(v)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder={placeholder}
          value={draft}
          disabled={atMax}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md disabled:opacity-50"
          onClick={add}
          disabled={atMax}
        >
          Add
        </button>
      </div>
      {hintMsg ? <p className="text-sm text-amber-700">{hintMsg}</p> : null}
      {atMax ? (
        <p className="text-xs text-slate-500">Maximum reached. Remove a tag to add another.</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StudentSettings() {
  const [local, setLocal] = useState<LocalSettings>(LOCAL_DEFAULTS);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    notifyNewPositions: false,
    notificationKeywords: [],
    notificationDepartments: [],
    notificationFrequency: 'hourly',
  });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    setLocal(loadLocalSettings());
    api.students
      .getNotificationPreferences()
      .then((p) => {
        setPrefs(p);
        setPrefsError(null);
      })
      .catch(() => setPrefsError('Could not load notification preferences.'))
      .finally(() => setPrefsLoading(false));
  }, []);

  const persistLocal = (next: LocalSettings) => {
    setLocal(next);
    localStorage.setItem(`${STORAGE_PREFIX}v1`, JSON.stringify(next));
    setSavedFlash('Local preferences saved.');
    window.setTimeout(() => setSavedFlash(null), 2000);
  };

  const toggleLocal = (key: keyof LocalSettings) => {
    persistLocal({ ...local, [key]: !local[key] });
  };

  const savePrefs = async (patch: Partial<NotificationPreferences>) => {
    setPrefsError(null);
    const next: NotificationPreferences = { ...prefs, ...patch };
    const prev = prefs;
    setPrefs(next);
    try {
      const saved = await api.students.updateNotificationPreferences(next);
      setPrefs(saved);
      setSavedFlash('Notification preferences saved.');
    } catch (err) {
      setPrefs(prev);
      const msg =
        err instanceof ApiError ? err.message : 'Failed to save preferences. Please try again.';
      setPrefsError(msg);
    }
    window.setTimeout(() => setSavedFlash(null), 2500);
  };

  const addSuggestedDepartment = (name: string) => {
    if (prefs.notificationDepartments.length >= MAX_DEPARTMENTS) return;
    if (prefs.notificationDepartments.some((d) => d.toLowerCase() === name.toLowerCase())) return;
    void savePrefs({ notificationDepartments: [...prefs.notificationDepartments, name] });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-2">Settings</h1>
        <p className="text-slate-600 text-sm mb-8">
          Notifications and preferences. Profile details (major, resume, bio) are under{' '}
          <Link to="/student/profile" className="text-teal-600 hover:underline">
            Profile
          </Link>
          .
        </p>

        {savedFlash ? (
          <div className="mb-4 p-3 bg-teal-50 text-teal-800 rounded-lg text-sm border border-teal-100" role="status">
            {savedFlash}
          </div>
        ) : null}
        {prefsError ? (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100" role="alert">
            {prefsError}
          </div>
        ) : null}

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-inherit mb-1">Notification preferences</h2>
            <p className="text-sm text-slate-600 mb-3">
              Choose departments and keywords so we only email you about research opportunities you care about. These
              settings control new position alert emails from ResearchHub.
            </p>
            <div className="space-y-5 border border-slate-200 rounded-lg p-4 bg-white">
              {prefsLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <Label htmlFor="research-email-master" className="text-base">
                        Email notifications for research opportunities
                      </Label>
                      <p className="text-sm text-slate-600">
                        When on, you can receive batched emails when new open positions match your profile, keywords, and
                        department filters. Turn off to stop all research opportunity alert emails.
                      </p>
                    </div>
                    <Switch
                      id="research-email-master"
                      checked={prefs.notifyNewPositions}
                      onCheckedChange={(checked) => void savePrefs({ notifyNewPositions: checked })}
                      aria-label="Enable research opportunity emails"
                    />
                  </div>

                  {prefs.notifyNewPositions ? (
                    <div className="space-y-5 border-t border-slate-100 pt-4">
                      <div className="space-y-2">
                        <Label className="text-base">Email frequency</Label>
                        <p className="text-sm text-slate-600">
                          How often we send a single email that batches new matching positions.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(
                            [
                              { value: 'immediately', label: 'Immediately' },
                              { value: 'hourly', label: 'Hourly' },
                              { value: 'daily', label: 'Daily' },
                              { value: 'weekly', label: 'Weekly' },
                            ] as { value: NotificationFrequency; label: string }[]
                          ).map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => void savePrefs({ notificationFrequency: value })}
                              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                                prefs.notificationFrequency === value
                                  ? 'bg-teal-600 text-white border-teal-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-teal-400'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <TagInput
                        label="Keyword filters"
                        hint='Notify when a position title, description, PI research areas, or required skills contain any of these phrases (for example "machine learning", "biology", "psychology"). Works together with your profile skills and GPA.'
                        values={prefs.notificationKeywords}
                        placeholder="e.g. machine learning"
                        maxItems={MAX_KEYWORDS}
                        onChange={(next) => void savePrefs({ notificationKeywords: next })}
                      />

                      <div className="space-y-2">
                        <Label className="text-base">Department filters</Label>
                        <p className="text-sm text-slate-600">
                          If you add any department, you will only get alerts for positions whose PI department matches
                          one of them. Leave empty to allow all departments.
                        </p>
                        <p className="text-xs text-slate-500">Quick add:</p>
                        <div className="flex flex-wrap gap-2">
                          {DEPARTMENT_SUGGESTIONS.map((d) => {
                            const taken = prefs.notificationDepartments.some(
                              (x) => x.toLowerCase() === d.toLowerCase()
                            );
                            return (
                              <button
                                key={d}
                                type="button"
                                disabled={taken || prefs.notificationDepartments.length >= MAX_DEPARTMENTS}
                                onClick={() => addSuggestedDepartment(d)}
                                className="px-2.5 py-1 text-xs rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-400 hover:bg-teal-50 disabled:opacity-40 disabled:pointer-events-none"
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <TagInput
                        label="Your departments"
                        hint="Add custom department names if they are not listed above."
                        values={prefs.notificationDepartments}
                        placeholder="e.g. Cognitive Science"
                        maxItems={MAX_DEPARTMENTS}
                        onChange={(next) => void savePrefs({ notificationDepartments: next })}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Other notifications</h2>
            <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-white">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300"
                  checked={local.emailStatusUpdates}
                  onChange={() => toggleLocal('emailStatusUpdates')}
                />
                <span>
                  <span className="font-medium text-inherit block">Application status emails</span>
                  <span className="text-sm text-slate-600">
                    When a lab updates your application (for example reviewing or accepted). Delivery depends on server
                    email configuration.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300"
                  checked={local.browserNotifications}
                  onChange={() => toggleLocal('browserNotifications')}
                />
                <span>
                  <span className="font-medium text-inherit block">Browser reminders</span>
                  <span className="text-sm text-slate-600">
                    Optional on-device reminders for deadlines you save later.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Miscellaneous</h2>
            <div className="border border-slate-200 rounded-lg p-4 bg-white text-sm text-slate-600">
              More preferences (language, accessibility) can be added here as the product grows.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
