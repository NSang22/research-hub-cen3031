import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Card } from '../../components/Card';
import { FilterBar } from '../../components/FilterBar';
import { api } from '../../lib/api';
import type { StudentProfile } from '../../types';

export function StudentList() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    major: '',
    minGpa: '',
    skills: '',
    yearLevel: '',
  });

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.major) params.major = filters.major;
    if (filters.minGpa) params.minGpa = filters.minGpa;
    if (filters.skills) params.skills = filters.skills;
    if (filters.yearLevel) params.yearLevel = filters.yearLevel;
    api.students
      .list(params)
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [filters]);

  const resetFilters = () =>
    setFilters({ major: '', minGpa: '', skills: '', yearLevel: '' });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-inherit mb-6">Browse Students</h1>
        <FilterBar
          filters={{
            major: (
              <>
                <label className="text-xs font-medium text-inherit">Major</label>
                <input
                  type="text"
                  value={filters.major}
                  onChange={(e) => setFilters((f) => ({ ...f, major: e.target.value }))}
                  placeholder="Major"
                  className="px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </>
            ),
            minGpa: (
              <>
                <label className="text-xs font-medium text-inherit">Min GPA</label>
                <input
                  type="number"
                  step="0.01"
                  value={filters.minGpa}
                  onChange={(e) => setFilters((f) => ({ ...f, minGpa: e.target.value }))}
                  placeholder="GPA"
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
            yearLevel: (
              <>
                <label className="text-xs font-medium text-inherit">Year</label>
                <select
                  value={filters.yearLevel}
                  onChange={(e) => setFilters((f) => ({ ...f, yearLevel: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded text-sm"
                >
                  <option value="">Any</option>
                  <option value="freshman">Freshman</option>
                  <option value="sophomore">Sophomore</option>
                  <option value="junior">Junior</option>
                  <option value="senior">Senior</option>
                  <option value="grad">Grad</option>
                </select>
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
        ) : students.length === 0 ? (
          <div className="mt-6 p-8 text-center text-inherit bg-white rounded-lg border">
            No students found. Try adjusting your filters.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {students.map((s) => (
              <Link key={s.id} to={`/pi/students/${s.id}`}>
                <Card>
                  <div className="p-6">
                    <h3 className="font-semibold text-inherit">
                      {s.firstName} {s.lastName}
                    </h3>
                    <p className="text-sm text-inherit">{s.email}</p>
                    {s.major && (
                      <p className="text-sm text-teal-600 mt-1">{s.major}</p>
                    )}
                    {s.bio && (
                      <p className="text-inherit mt-2 line-clamp-2">{s.bio}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.skills?.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 bg-slate-100 text-inherit rounded text-xs"
                        >
                          {sk}
                        </span>
                      ))}
                      {s.gpa != null && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs">
                          GPA: {s.gpa}
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
