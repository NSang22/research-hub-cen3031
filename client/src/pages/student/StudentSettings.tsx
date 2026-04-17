import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
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

// ---------------------------------------------------------------------------
// Tag-input helper
// ---------------------------------------------------------------------------

function TagInput({
  label,
  hint,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
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
          className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md"
          onClick={add}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function StudentSettings() {
  const [local, setLocal] = useState<LocalSettings>(LOCAL_DEFAULTS);

  // Server-backed notification prefs
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
    api.notifications
      .getPreferences()
      .then((p) => setPrefs(p))
      .catch(() => setPrefsError('Could not load notification preferences.'))
      .finally(() => setPrefsLoading(false));
  }, []);

  // ── Local settings ────────────────────────────────────────────────────────

  const persistLocal = (next: LocalSettings) => {
    setLocal(next);
    localStorage.setItem(`${STORAGE_PREFIX}v1`, JSON.stringify(next));
    setSavedFlash('Local preferences saved.');
    window.setTimeout(() => setSavedFlash(null), 2000);
  };

  const toggleLocal = (key: keyof LocalSettings) => {
    persistLocal({ ...local, [key]: !local[key] });
  };

  // ── Server prefs ──────────────────────────────────────────────────────────

  const savePrefs = async (next: NotificationPreferences) => {
    setPrefs(next);
    try {
      const saved = await api.notifications.updatePreferences(next);
      setPrefs(saved);
      setSavedFlash('Notification preferences saved.');
    } catch {
      setPrefsError('Failed to save preferences — please try again.');
    }
    window.setTimeout(() => setSavedFlash(null), 2500);
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
          <div className="mb-4 p-3 bg-teal-50 text-teal-800 rounded-lg text-sm">{savedFlash}</div>
        ) : null}
        {prefsError ? (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{prefsError}</div>
        ) : null}

        <section className="space-y-6">

          {/* ── New-position alerts (server-backed) ── */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              New Position Alerts
            </h2>
            <div className="space-y-5 border border-slate-200 rounded-lg p-4 bg-white">
              {prefsLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : (
                <>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-slate-300"
                      checked={prefs.notifyNewPositions}
                      onChange={() =>
                        savePrefs({ ...prefs, notifyNewPositions: !prefs.notifyNewPositions })
                      }
                    />
                    <span>
                      <span className="font-medium text-inherit block">
                        Email me when new positions are posted
                      </span>
                      <span className="text-sm text-slate-600">
                        Receive an email (at most once per hour) when a new position matches your skills or
                        GPA on your profile. Custom keyword filters add to that. Department filter, if set,
                        restricts alerts to only those departments.
                      </span>
                    </span>
                  </label>

                  {prefs.notifyNewPositions && (
                    <div className="pl-7 space-y-5 border-t border-slate-100 pt-4">
                      <div className="space-y-2">
                        <span className="font-medium text-inherit block">Email frequency</span>
                        <span className="text-sm text-slate-600 block">
                          How often you receive notification emails. Batches all new matches into one email.
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(
                            [
                              { value: 'immediately', label: 'Immediately' },
                              { value: 'hourly',       label: 'Hourly' },
                              { value: 'daily',        label: 'Daily' },
                              { value: 'weekly',       label: 'Weekly' },
                            ] as { value: NotificationFrequency; label: string }[]
                          ).map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => savePrefs({ ...prefs, notificationFrequency: value })}
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
                        label="Keyword filters (additive)"
                        hint="Also notify me for positions whose title, description, or research area contains any of these keywords — on top of your skill/GPA matches."
                        values={prefs.notificationKeywords}
                        placeholder="e.g. machine learning"
                        onChange={(next) =>
                          savePrefs({ ...prefs, notificationKeywords: next })
                        }
                      />
                      <TagInput
                        label="Department filters (exclusive)"
                        hint="Only receive alerts from these departments. Leave empty to receive alerts from all departments."
                        values={prefs.notificationDepartments}
                        placeholder="e.g. Computer Science"
                        onChange={(next) =>
                          savePrefs({ ...prefs, notificationDepartments: next })
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Other notification settings (local-only) ── */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Other Notifications
            </h2>
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
                    When a lab updates your application (e.g. reviewing, accepted). Email delivery depends on
                    server configuration.
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Miscellaneous
            </h2>
            <div className="border border-slate-200 rounded-lg p-4 bg-white text-sm text-slate-600">
              More preferences (language, accessibility) can be added here as the product grows.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
