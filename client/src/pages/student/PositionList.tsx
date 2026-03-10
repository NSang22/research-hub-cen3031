import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Card } from '../../components/Card';
import { FilterBar } from '../../components/FilterBar';
import { api } from '../../lib/api';
import type { Position } from '../../types';

export function PositionList() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    skills: '',
    isFunded: '',
    department: '',
  });

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.skills) params.skills = filters.skills;
    if (filters.isFunded) params.isFunded = filters.isFunded;
    if (filters.department) params.department = filters.department;
    api.positions
      .list(params)
      .then(setPositions)
      .finally(() => setLoading(false));
  }, [filters]);

  const resetFilters = () => setFilters({ search: '', skills: '', isFunded: '', department: '' });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-6">Browse Positions</h1>
        <FilterBar
          filters={{
            search: (
              <>
                <label className="text-xs font-medium text-inherit">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Title or description"
                  className="px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </>
            ),
            skills: (
              <>
                <label className="text-xs font-medium text-inherit">Skills</label>
                <input
                  type="text"
                  value={filters.skills}
                  onChange={(e) => setFilters((f) => ({ ...f, skills: e.target.value }))}
                  placeholder="Comma-separated"
                  className="px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </>
            ),
            funded: (
              <>
                <label className="text-xs font-medium text-inherit">Funded</label>
                <select
                  value={filters.isFunded}
                  onChange={(e) => setFilters((f) => ({ ...f, isFunded: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded text-sm"
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                </select>
              </>
            ),
            department: (
              <>
                <label className="text-xs font-medium text-inherit">Department</label>
                <input
                  type="text"
                  value={filters.department}
                  onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
                  placeholder="Department"
                  className="px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </>
            ),
          }}
          onReset={resetFilters}
        />
        {loading ? (
          <div className="mt-6 animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="mt-6 p-8 text-center text-inherit bg-white rounded-lg border">
            No positions found. Try adjusting your filters.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {positions.map((pos) => (
              <Link key={pos.id} to={`/student/positions/${pos.id}`}>
                <Card>
                  <div className="p-6">
                    <h3 className="font-semibold text-inherit">{pos.title}</h3>
                    {pos.labName && (
                      <p className="text-sm text-teal-600 mt-1">{pos.labName}</p>
                    )}
                    {pos.department && (
                      <p className="text-sm text-inherit">{pos.department}</p>
                    )}
                    {pos.description && (
                      <p className="text-inherit mt-2 line-clamp-2">{pos.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pos.requiredSkills?.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-slate-100 text-inherit rounded text-xs"
                        >
                          {s}
                        </span>
                      ))}
                      {pos.isFunded && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs">
                          Funded
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
