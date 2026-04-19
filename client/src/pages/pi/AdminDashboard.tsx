import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { LabMetrics, CompensationType } from '../../types';
import './admin-dashboard.css';

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<LabMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    positionType: 'all' as 'all' | CompensationType,
  });

  useEffect(() => {
    loadMetrics();
  }, [filters]);

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.positionType !== 'all') params.positionType = filters.positionType;
      const data = await api.pis.getMetrics(params);
      setMetrics(data);
    } catch (err) {
      setError('Failed to load metrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="admin-dashboard-page">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-40 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="admin-dashboard-page">
          <div className="error-box">{error}</div>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const openPositions = metrics.positionsByStatus?.open || 0;
  const closedPositions = metrics.positionsByStatus?.closed || 0;
  const filledPositions = metrics.positionsByStatus?.filled || 0;

  const pendingApps = metrics.applicationsByStatus?.pending || 0;
  const reviewingApps = metrics.applicationsByStatus?.reviewing || 0;
  const acceptedApps = metrics.applicationsByStatus?.accepted || 0;
  const rejectedApps = metrics.applicationsByStatus?.rejected || 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="admin-dashboard-page">
        <header className="dashboard-header">
          <div>
            <h1>Lab Metrics Dashboard</h1>
            {metrics.labName && <p className="lab-info">{metrics.labName}</p>}
            {metrics.department && <p className="dept-info">{metrics.department}</p>}
          </div>
        </header>

        <section className="filters-section">
          <h2>Filters</h2>
          <div className="filters-grid">
            <div>
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label>Position Type</label>
              <select
                value={filters.positionType}
                onChange={(e) => setFilters((f) => ({ ...f, positionType: e.target.value as typeof f.positionType }))}
              >
                <option value="all">All Types</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="credit">Credit</option>
                <option value="stipend">Stipend</option>
              </select>
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <div className="metric-card">
            <h3>Total Positions</h3>
            <p className="metric-value">{metrics.totalPositions}</p>
            <div className="metric-breakdown">
              <span>Open: {openPositions}</span>
              <span>Closed: {closedPositions}</span>
              <span>Filled: {filledPositions}</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Total Applications</h3>
            <p className="metric-value">{metrics.totalApplications}</p>
            <div className="metric-breakdown">
              <span>Pending: {pendingApps}</span>
              <span>Reviewing: {reviewingApps}</span>
              <span>Accepted: {acceptedApps}</span>
              <span>Rejected: {rejectedApps}</span>
            </div>
          </div>

          <div className="metric-card">
            <h3>Avg. Time to Fill</h3>
            <p className="metric-value">
              {metrics.avgTimeToFill !== null ? `${metrics.avgTimeToFill} days` : 'N/A'}
            </p>
            <p className="metric-desc">Average time from position creation to close/fill</p>
          </div>

          <div className="metric-card">
            <h3>Total Enrolled</h3>
            <p className="metric-value">{metrics.totalEnrolled}</p>
            <p className="metric-desc">Students with accepted applications</p>
          </div>
        </section>

        <section className="recent-positions-section">
          <h2>Recent Positions</h2>
          {metrics.recentPositions.length === 0 ? (
            <p className="no-data">No positions found for the selected filters.</p>
          ) : (
            <div className="positions-table-wrapper">
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Applications</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentPositions.map((pos) => (
                    <tr key={pos.id}>
                      <td>{pos.title}</td>
                      <td>
                        <span className={`status-badge status-${pos.status}`}>
                          {pos.status}
                        </span>
                      </td>
                      <td>{pos.compensationType}</td>
                      <td>{pos.applicationCount}</td>
                      <td>{new Date(pos.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
