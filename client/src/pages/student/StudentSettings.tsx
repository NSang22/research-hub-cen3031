import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';

const STORAGE_PREFIX = 'rh-student-settings-';

type SettingsState = {
  emailStatusUpdates: boolean;
  emailDigest: boolean;
  browserNotifications: boolean;
};

const DEFAULTS: SettingsState = {
  emailStatusUpdates: true,
  emailDigest: false,
  browserNotifications: false,
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}v1`);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<SettingsState>;
    return {
      emailStatusUpdates: typeof p.emailStatusUpdates === 'boolean' ? p.emailStatusUpdates : DEFAULTS.emailStatusUpdates,
      emailDigest: typeof p.emailDigest === 'boolean' ? p.emailDigest : DEFAULTS.emailDigest,
      browserNotifications: typeof p.browserNotifications === 'boolean' ? p.browserNotifications : DEFAULTS.browserNotifications,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function StudentSettings() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const persist = (next: SettingsState) => {
    setSettings(next);
    localStorage.setItem(`${STORAGE_PREFIX}v1`, JSON.stringify(next));
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const toggle = (key: keyof SettingsState) => {
    persist({ ...settings, [key]: !settings[key] });
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
          <div className="mb-4 p-3 bg-teal-50 text-teal-800 rounded-lg text-sm">Preferences saved on this device.</div>
        ) : null}

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Notifications</h2>
            <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-white">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300"
                  checked={settings.emailStatusUpdates}
                  onChange={() => toggle('emailStatusUpdates')}
                />
                <span>
                  <span className="font-medium text-inherit block">Application status emails</span>
                  <span className="text-sm text-slate-600">
                    When a lab updates your application (e.g. reviewing, accepted). Email delivery depends on server
                    configuration.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300"
                  checked={settings.emailDigest}
                  onChange={() => toggle('emailDigest')}
                />
                <span>
                  <span className="font-medium text-inherit block">Weekly digest</span>
                  <span className="text-sm text-slate-600">Summary of new positions that match your skills (when available).</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-slate-300"
                  checked={settings.browserNotifications}
                  onChange={() => toggle('browserNotifications')}
                />
                <span>
                  <span className="font-medium text-inherit block">Browser reminders</span>
                  <span className="text-sm text-slate-600">Optional on-device reminders for deadlines you save later.</span>
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
