import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  FileText,
  Clock,
  GraduationCap,
  RefreshCw,
  FlaskConical,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { AdminMetrics, LabPIMember } from '../../types';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ label, value, sub, icon, color }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 flex items-start gap-4"
    >
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    filled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [pis, setPIs] = useState<LabPIMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'metrics' | 'pis'>('metrics');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [positionType, setPositionType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, piList] = await Promise.all([
        api.admin.getMetrics({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          positionType: positionType || undefined,
        }),
        api.admin.getPIs(),
      ]);
      setMetrics(m);
      setPIs(piList);
    } catch {
      setError('Failed to load dashboard. Ensure the backend is running and you are logged in as a lab administrator.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, positionType]);

  useEffect(() => { load(); }, [load]);

  const tabClass = (tab: 'metrics' | 'pis') =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tab
        ? 'bg-teal-600 text-white'
        : 'text-muted-foreground hover:bg-muted'
    }`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8" style={{ marginLeft: '14rem' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lab Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recruitment metrics and team overview for your lab
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button className={tabClass('metrics')} onClick={() => setActiveTab('metrics')}>
            Metrics
          </button>
          <button className={tabClass('pis')} onClick={() => setActiveTab('pis')}>
            PIs in Lab {pis.length > 0 && `(${pis.length})`}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading && !metrics && (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        )}

        {/* METRICS TAB */}
        {activeTab === 'metrics' && metrics && (
          <>
            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Position type</label>
                <select
                  value={positionType}
                  onChange={(e) => setPositionType(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring"
                >
                  <option value="">All types</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="credit">Credit</option>
                  <option value="stipend">Stipend</option>
                </select>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="PIs in Lab"
                value={metrics.piCount}
                icon={<FlaskConical size={20} className="text-indigo-600" />}
                color="bg-indigo-50 dark:bg-indigo-900/20"
              />
              <MetricCard
                label="Total Positions"
                value={metrics.positions.total}
                sub={`${metrics.positions.open_count} open · ${metrics.positions.filled_count} filled`}
                icon={<Briefcase size={20} className="text-blue-600" />}
                color="bg-blue-50 dark:bg-blue-900/20"
              />
              <MetricCard
                label="Total Applications"
                value={metrics.applications.total}
                sub={`${metrics.applications.pending_count} pending · ${metrics.applications.accepted_count} accepted`}
                icon={<FileText size={20} className="text-orange-500" />}
                color="bg-orange-50 dark:bg-orange-900/20"
              />
              <MetricCard
                label="Students Enrolled"
                value={metrics.totalEnrolled}
                sub="accepted into a position"
                icon={<GraduationCap size={20} className="text-green-600" />}
                color="bg-green-50 dark:bg-green-900/20"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <MetricCard
                label="Avg. Days to Fill"
                value={metrics.avgDaysToFill ? `${metrics.avgDaysToFill}d` : 'N/A'}
                sub="from position creation to close/fill"
                icon={<Clock size={20} className="text-yellow-600" />}
                color="bg-yellow-50 dark:bg-yellow-900/20"
              />
              <MetricCard
                label="Reviewing / Rejected"
                value={`${metrics.applications.reviewed_count} / ${metrics.applications.rejected_count}`}
                sub="in-review and rejected applications"
                icon={<Users size={20} className="text-teal-600" />}
                color="bg-teal-50 dark:bg-teal-900/20"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* PI breakdown */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <FlaskConical size={16} /> PI Breakdown
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">PI</th>
                        <th className="px-4 py-2 text-right text-muted-foreground font-medium">Positions</th>
                        <th className="px-4 py-2 text-right text-muted-foreground font-medium">Apps</th>
                        <th className="px-4 py-2 text-right text-muted-foreground font-medium">Enrolled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {metrics.piBreakdown.map((pi) => (
                        <tr key={pi.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 text-foreground">
                            <p className="font-medium">{pi.first_name} {pi.last_name}</p>
                            {pi.department && <p className="text-xs text-muted-foreground">{pi.department}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-foreground">{pi.position_count}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-foreground">{pi.application_count}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-green-600">{pi.enrolled_count}</td>
                        </tr>
                      ))}
                      {metrics.piBreakdown.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            No PIs have associated with this lab yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent positions */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Briefcase size={16} /> Recent Positions
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Title</th>
                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">PI</th>
                        <th className="px-4 py-2 text-right text-muted-foreground font-medium">Apps</th>
                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {metrics.recentPositions.map((pos) => (
                        <tr key={pos.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 text-foreground max-w-[160px] truncate">{pos.title}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {pos.pi_first_name} {pos.pi_last_name}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-foreground">{pos.application_count}</td>
                          <td className="px-4 py-2.5">{statusBadge(pos.status)}</td>
                        </tr>
                      ))}
                      {metrics.recentPositions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            No positions found for this lab yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PIs TAB */}
        {activeTab === 'pis' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Principal Investigators in Your Lab</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                PIs who have associated themselves with your lab via their profile settings.
              </p>
            </div>
            {pis.length === 0 ? (
              <div className="px-5 py-12 text-center text-muted-foreground">
                <FlaskConical size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No PIs associated yet</p>
                <p className="text-sm mt-1">
                  PIs can associate with your lab from their Profile page.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-muted-foreground font-medium">Name</th>
                      <th className="px-5 py-3 text-left text-muted-foreground font-medium">Email</th>
                      <th className="px-5 py-3 text-left text-muted-foreground font-medium">Department</th>
                      <th className="px-5 py-3 text-left text-muted-foreground font-medium">Lab Name</th>
                      <th className="px-5 py-3 text-right text-muted-foreground font-medium">Positions</th>
                      <th className="px-5 py-3 text-right text-muted-foreground font-medium">Applications</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pis.map((pi) => (
                      <tr key={pi.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 text-foreground font-medium">
                          {pi.firstName} {pi.lastName}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{pi.email}</td>
                        <td className="px-5 py-3 text-muted-foreground">{pi.department ?? 'N/A'}</td>
                        <td className="px-5 py-3 text-muted-foreground">{pi.labName ?? 'N/A'}</td>
                        <td className="px-5 py-3 text-right font-medium text-foreground">{pi.positionCount}</td>
                        <td className="px-5 py-3 text-right font-medium text-foreground">{pi.applicationCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
