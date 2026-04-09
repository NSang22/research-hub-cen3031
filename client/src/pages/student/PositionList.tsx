import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { Position } from '../../types';
import './position-browse.css';

/** Row shape for browse UI (maps API + computed fields). */
interface BrowseRow {
  id: string;
  title: string;
  labName: string;
  department: string;
  piName: string;
  description: string;
  skills: string[];
  isFunded: boolean;
  minGpa: number | null;
  deadline: string | null;
  postedDays: number;
}

function mapPosition(p: Position): BrowseRow {
  const created = p.createdAt ? new Date(p.createdAt) : new Date();
  const postedDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86_400_000));
  return {
    id: p.id,
    title: p.title,
    labName: p.labName ?? '',
    department: p.department ?? '',
    piName: '',
    description: p.description ?? '',
    skills: p.requiredSkills ?? [],
    isFunded: p.isFunded,
    minGpa: p.minGpa,
    deadline: p.deadline,
    postedDays,
  };
}

function daysLabel(d: number): string {
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

function deadlineLabel(dl: string | null): string | null {
  if (!dl) return null;
  const date = new Date(dl);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PositionList() {
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [funded, setFunded] = useState('any');
  const [dept, setDept] = useState('');

  useEffect(() => {
    api.positions
      .list({})
      .then((list) => setRows(list.map(mapPosition)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const allDepartments = useMemo(
    () => [...new Set(rows.map((p) => p.department).filter(Boolean))].sort(),
    [rows]
  );
  const allSkills = useMemo(
    () => [...new Set(rows.flatMap((p) => p.skills))].sort(),
    [rows]
  );

  const addSkill = (skill: string) => {
    if (skill && !selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

  const resetFilters = () => {
    setSearch('');
    setSkillInput('');
    setSelectedSkills([]);
    setFunded('any');
    setDept('');
  };

  const filtered = useMemo(() => {
    const results = rows.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.labName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (funded === 'yes' && !p.isFunded) return false;
      if (funded === 'no' && p.isFunded) return false;
      if (dept && p.department !== dept) return false;
      if (selectedSkills.length) {
        const has = p.skills.some((s) =>
          selectedSkills.some((f) => s.toLowerCase().includes(f.toLowerCase()))
        );
        if (!has) return false;
      }
      return true;
    });
    results.sort((a, b) => a.postedDays - b.postedDays);
    return results;
  }, [rows, search, selectedSkills, funded, dept]);

  const activeFilterCount =
    (search ? 1 : 0) +
    selectedSkills.length +
    (funded !== 'any' ? 1 : 0) +
    (dept ? 1 : 0);

  const suggestedSkills = allSkills
    .filter((s) => !selectedSkills.includes(s) && s.toLowerCase().includes(skillInput.toLowerCase()))
    .slice(0, 5);

  const deptCount = allDepartments.length;

  return (
    <div className="min-h-screen">
      <Navbar />
      {loading ? (
        <div className="bp-page">
          <div className="bp-container">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded w-1/3" />
              <div className="h-40 bg-slate-200 rounded-xl" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bp-page">
          <div className="bp-container">
            <div className="bp-header">
              <h1 className="bp-title">Browse Positions</h1>
              <p className="bp-subtitle">
                <strong>{rows.length}</strong> open positions across <strong>{deptCount}</strong> departments
              </p>
            </div>

            <div className="bp-filters">
              <div className="bp-filter-row">
                <div className="bp-filter-group">
                  <label className="bp-filter-label">Search</label>
                  <input
                    className="bp-input"
                    placeholder="Title, lab, or keyword…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="bp-filter-group">
                  <label className="bp-filter-label">Skills</label>
                  <input
                    className="bp-input"
                    placeholder="Type to filter skills…"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && suggestedSkills.length > 0) {
                        e.preventDefault();
                        addSkill(suggestedSkills[0]);
                      }
                    }}
                  />
                  {skillInput && suggestedSkills.length > 0 && (
                    <div className="bp-skill-dropdown">
                      {suggestedSkills.map((s) => (
                        <div key={s} className="bp-skill-option" onClick={() => addSkill(s)} role="option">
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bp-filter-group">
                  <label className="bp-filter-label">Funded</label>
                  <select className="bp-select" value={funded} onChange={(e) => setFunded(e.target.value)}>
                    <option value="any">Any</option>
                    <option value="yes">Funded</option>
                    <option value="no">Unfunded</option>
                  </select>
                </div>

                <div className="bp-filter-group">
                  <label className="bp-filter-label">Department</label>
                  <select className="bp-select" value={dept} onChange={(e) => setDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {allDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {activeFilterCount > 0 && (
                  <button type="button" className="bp-reset" onClick={resetFilters}>
                    Reset ({activeFilterCount})
                  </button>
                )}
              </div>

              {selectedSkills.length > 0 && (
                <div className="bp-active-filters">
                  {selectedSkills.map((s) => (
                    <span key={s} className="bp-skill-pill">
                      {s}
                      <span
                        className="bp-skill-pill-x"
                        onClick={() => removeSkill(s)}
                        onKeyDown={(e) => e.key === 'Enter' && removeSkill(s)}
                        role="button"
                        tabIndex={0}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bp-results-meta">
              {filtered.length} position{filtered.length !== 1 ? 's' : ''} found
            </div>

            <div className="bp-cards">
              {filtered.length === 0 ? (
                <div className="bp-empty">
                  <svg className="bp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <div className="bp-empty-title">
                    {rows.length === 0 ? 'No open positions yet' : 'No positions match your filters'}
                  </div>
                  <div className="bp-empty-sub">
                    {rows.length === 0
                      ? 'Check back later for new research opportunities.'
                      : 'Try broadening your search or removing some filters.'}
                  </div>
                </div>
              ) : (
                filtered.map((p) => {
                  const deadlineShort = p.deadline ? deadlineLabel(p.deadline) : null;
                  return (
                    <Link key={p.id} to={`/student/positions/${p.id}`} className="bp-card">
                      <div className="bp-card-top">
                        <div className="bp-card-title">{p.title}</div>
                        <div className="bp-card-meta">
                          {p.isFunded ? (
                            <span className="bp-badge-funded">Funded</span>
                          ) : (
                            <span className="bp-badge-unfunded">Volunteer</span>
                          )}
                          <span className="bp-posted">{daysLabel(p.postedDays)}</span>
                        </div>
                      </div>

                      <div className="bp-card-lab">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M9 3v2m6-2v2M5 8h14M5 8a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2" />
                        </svg>
                        {p.labName}
                        {p.piName ? ` · ${p.piName}` : ''}
                      </div>
                      {p.department ? <div className="bp-card-dept">{p.department}</div> : null}

                      <div className="bp-card-desc">{p.description || 'No description.'}</div>

                      <div className="bp-card-footer">
                        <div className="bp-card-skills">
                          {p.skills.map((s) => (
                            <span
                              key={s}
                              className={`bp-chip ${
                                selectedSkills.some((f) => s.toLowerCase().includes(f.toLowerCase())) ? 'matched' : ''
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="bp-card-right-meta">
                          {deadlineShort ? (
                            <span className="bp-deadline">
                              Due <strong>{deadlineShort}</strong>
                            </span>
                          ) : null}
                          {p.minGpa != null && p.minGpa > 0 && (
                            <span className="bp-gpa">≥ {p.minGpa} GPA</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
