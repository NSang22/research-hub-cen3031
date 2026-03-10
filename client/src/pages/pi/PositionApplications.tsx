import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { api } from '../../lib/api';

interface AppWithStudent {
  id: string;
  studentId: string;
  status: string;
  coverLetter: string | null;
  appliedAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  major?: string;
  gpa?: number;
  skills?: string[];
  bio?: string;
  resumeUrl?: string;
  yearLevel?: string;
}

export function PositionApplications() {
  const { id } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<AppWithStudent[]>([]);
  const [positionTitle, setPositionTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppWithStudent | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.positions.getById(id).then((p) => setPositionTitle(p.title));
    api.applications
      .byPosition(id)
      .then(setApplications)
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (appId: string, status: string) => {
    setUpdating(true);
    try {
      await api.applications.updateStatus(appId, status);
      setApplications((apps) =>
        apps.map((a) => (a.id === appId ? { ...a, status } : a))
      );
      setSelectedApp((a) => (a?.id === appId ? { ...a, status } : a));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/pi/dashboard" className="text-teal-600 hover:underline mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-inherit mb-2">
          Applications: {positionTitle || 'Position'}
        </h1>
        <p className="text-inherit mb-6">{applications.length} applicant(s)</p>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-inherit">
            No applications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-lg border border-slate-200 p-4 flex justify-between items-center"
              >
                <div>
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="font-medium text-inherit hover:text-teal-600 text-left"
                  >
                    {app.firstName} {app.lastName}
                  </button>
                  <p className="text-sm text-inherit">{app.email}</p>
                  {app.major && (
                    <p className="text-sm text-inherit">
                      {app.major}
                      {app.gpa != null && ` · GPA: ${app.gpa}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={app.status as 'pending' | 'reviewed' | 'accepted' | 'rejected'} />
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    disabled={updating}
                    className="text-sm border border-slate-300 rounded px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <Link
                    to={`/pi/students/${app.studentId}`}
                    className="text-sm text-teal-600 hover:underline"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={selectedApp ? `${selectedApp.firstName} ${selectedApp.lastName}` : ''}
      >
        {selectedApp && (
          <div className="space-y-3 text-sm">
            <p><strong>Email:</strong> {selectedApp.email}</p>
            {selectedApp.major && <p><strong>Major:</strong> {selectedApp.major}</p>}
            {selectedApp.gpa != null && <p><strong>GPA:</strong> {selectedApp.gpa}</p>}
            {selectedApp.yearLevel && (
              <p><strong>Year:</strong> {selectedApp.yearLevel}</p>
            )}
            {selectedApp.skills && selectedApp.skills.length > 0 && (
              <p><strong>Skills:</strong> {selectedApp.skills.join(', ')}</p>
            )}
            {selectedApp.coverLetter && (
              <div>
                <strong>Cover letter:</strong>
                <p className="mt-1 text-inherit whitespace-pre-wrap">{selectedApp.coverLetter}</p>
              </div>
            )}
            <Link
              to={`/pi/students/${selectedApp.studentId}`}
              className="inline-block mt-2 text-teal-600 hover:underline"
            >
              View full profile →
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
