import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../lib/api';

interface AppWithMeta {
  id: string;
  positionId: string;
  status: string;
  appliedAt: string;
  positionTitle?: string;
  labName?: string;
}

export function StudentApplications() {
  const [applications, setApplications] = useState<AppWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.applications
      .mine()
      .then(setApplications)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Applications</h1>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-lg" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-slate-600">
              No applications yet.{' '}
              <Link to="/student/positions" className="text-teal-600 hover:underline">
                Browse positions
              </Link>{' '}
              to apply.
            </div>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg border border-slate-200 overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Position</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Lab</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/student/positions/${app.positionId}`}
                        className="font-medium text-slate-900 hover:text-teal-600"
                      >
                        {app.positionTitle || 'Position'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{app.labName || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status as 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
