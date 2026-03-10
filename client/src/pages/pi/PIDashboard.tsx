import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Card } from '../../components/Card';
import { api } from '../../lib/api';

interface PositionWithCount {
  id: string;
  title: string;
  isOpen: boolean;
  appCount?: number;
}

export function PIDashboard() {
  const [positions, setPositions] = useState<PositionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);

  useEffect(() => {
    api.positions
      .mine()
      .then(setPositions)
      .finally(() => setLoading(false));
  }, []);

  const handleClose = async (id: string) => {
    await api.positions.close(id);
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, isOpen: false } : p)));
    setConfirmCloseId(null);
  };

  const openCount = positions.filter((p) => p.isOpen).length;
  const totalApps = positions.reduce((acc, p) => acc + (p.appCount || 0), 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-6">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-inherit">Open Positions</h2>
              <p className="text-3xl font-bold text-teal-600 mt-1">{openCount}</p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-inherit">Total Applications</h2>
              <p className="text-3xl font-bold text-teal-600 mt-1">{totalApps}</p>
            </div>
          </Card>
        </div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-inherit">My Positions</h2>
          <Link
            to="/pi/positions/new"
            className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700"
          >
            New Position
          </Link>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-lg" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-inherit">
              No positions yet.{' '}
              <Link to="/pi/positions/new" className="text-teal-600 hover:underline">
                Create your first position
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => (
              <Card key={pos.id}>
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <Link
                      to={`/pi/positions/${pos.id}/edit`}
                      className="font-medium text-inherit hover:text-teal-600"
                    >
                      {pos.title}
                    </Link>
                    <p className="text-sm text-inherit">
                      {pos.isOpen ? 'Open' : 'Closed'} · {pos.appCount || 0} applications
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Link
                      to={`/pi/positions/${pos.id}/applications`}
                      className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg"
                    >
                      View applications
                    </Link>
                    <Link
                      to={`/pi/positions/${pos.id}/edit`}
                      className="px-4 py-2 text-sm font-medium text-inherit hover:bg-slate-100 rounded-lg"
                    >
                      Edit
                    </Link>
                    {pos.isOpen && confirmCloseId !== pos.id && (
                      <button
                        onClick={() => setConfirmCloseId(pos.id)}
                        className="px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        Close
                      </button>
                    )}
                    {confirmCloseId === pos.id && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-700">Notify applicants &amp; close?</span>
                        <button
                          onClick={() => handleClose(pos.id)}
                          className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmCloseId(null)}
                          className="px-3 py-1 text-xs font-medium text-inherit hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
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
