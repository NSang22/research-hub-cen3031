import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../lib/api';

export function StudentDashboard() {
  const [applications, setApplications] = useState<Array<{ id: string; positionId: string; positionTitle?: string; labName?: string; status: string; appliedAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.students.getProfile(), api.applications.mine()])
      .then(([, apps]) => {
        setApplications(apps);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse h-8 bg-slate-200 rounded w-1/3 mb-6" />
          <div className="animate-pulse h-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-6">Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-inherit mb-2">Profile</h2>
              <p className="text-inherit mb-4">Complete your profile to stand out to PIs.</p>
              <Link
                to="/student/profile"
                className="text-teal-600 font-medium hover:underline"
              >
                Edit profile →
              </Link>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-inherit mb-2">Browse Positions</h2>
              <p className="text-inherit mb-4">Find research opportunities that match your skills.</p>
              <Link
                to="/student/positions"
                className="text-teal-600 font-medium hover:underline"
              >
                Browse positions →
              </Link>
            </div>
          </Card>
        </div>
        <h2 className="text-lg font-semibold text-inherit mb-4">Recent Applications</h2>
        {applications.length === 0 ? (
          <Card>
            <div className="p-6 text-center text-inherit">
              No applications yet. <Link to="/student/positions" className="text-teal-600 hover:underline">Browse positions</Link> to apply.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.slice(0, 5).map((app) => (
              <Card key={app.id}>
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <Link to={`/student/positions/${app.positionId}`} className="font-medium text-inherit hover:text-teal-600">
                      {app.positionTitle || 'Position'}
                    </Link>
                    {app.labName && <p className="text-sm text-inherit">{app.labName}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status as 'pending' | 'reviewed' | 'accepted' | 'rejected'} />
                    <Link to="/student/applications" className="text-sm text-teal-600 hover:underline">
                      View all →
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
