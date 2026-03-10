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
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-6">My Applications</h1>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-lg" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-inherit">
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-inherit">Position</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-inherit">Lab</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-inherit">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-inherit">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/student/positions/${app.positionId}`}
                        className="font-medium text-inherit hover:text-teal-600"
                      >
                        {app.positionTitle || 'Position'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-inherit">{app.labName || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status as 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'} />
                    </td>
                    <td className="px-4 py-3 text-inherit text-sm">
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
