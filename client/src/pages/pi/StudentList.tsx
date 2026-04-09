import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { AcademicLevel, StudentProfile } from '../../types';
import './student-browse.css';

const YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any year' },
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'grad', label: 'Grad' },
  { value: 'masters', label: 'Masters' },
  { value: 'phd', label: 'PhD' },
  { value: 'postdoc', label: 'Postdoc' },
];

function formatYearLabel(yl: AcademicLevel | null | undefined): string {
  if (!yl) return '';
  const map: Record<string, string> = {
    freshman: 'Freshman',
    sophomore: 'Sophomore',
    junior: 'Junior',
    senior: 'Senior',
    grad: 'Grad',
    masters: 'Masters',
    phd: 'PhD',
    postdoc: 'Postdoc',
  };
  return map[yl] || yl;
}

/** Name + email only; nothing meaningful in profile fields */
function isProfileIncomplete(s: StudentProfile): boolean {
  const has =
    Boolean(s.major?.trim()) ||
    s.yearLevel != null ||
    s.graduationYear != null ||
    Boolean(s.bio?.trim()) ||
    (s.skills?.length ?? 0) > 0 ||
    s.gpa != null;
  return !has;
}

export function StudentList() {
  const navigate = useNavigate();
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [major, setMajor] = useState('');
  const [minGpa, setMinGpa] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    api.students
      .list({})
      .then(setAllStudents)
      .catch(() => setAllStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const allSkills = useMemo(
    () => [...new Set(allStudents.flatMap((s) => s.skills || []))].sort(),
    [allStudents]
  );

  const addSkill = (skill: string) => {
    if (skill && !selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((x) => x !== skill));
  };

  const resetFilters = () => {
    setMajor('');
    setMinGpa('');
    setYearLevel('');
    setSkillInput('');
    setSelectedSkills([]);
  };

  const filtered = useMemo(() => {
    let list = [...allStudents];

    if (major.trim()) {
      const q = major.toLowerCase();
      list = list.filter((s) => s.major?.toLowerCase().includes(q));
    }
    if (minGpa !== '') {
      const min = parseFloat(minGpa);
      if (!Number.isNaN(min)) {
        list = list.filter((s) => s.gpa != null && s.gpa >= min);
      }
    }
    if (yearLevel) {
      list = list.filter((s) => s.yearLevel === yearLevel);
    }
    if (selectedSkills.length) {
      list = list.filter((s) =>
        (s.skills || []).some((sk) =>
          selectedSkills.some((f) => sk.toLowerCase().includes(f.toLowerCase()))
        )
      );
    }

    list.sort((a, b) => {
      const ia = isProfileIncomplete(a) ? 1 : 0;
      const ib = isProfileIncomplete(b) ? 1 : 0;
      if (ia !== ib) return ia - ib;
      const na = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
      const nb = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
      return na.localeCompare(nb);
    });

    return list;
  }, [allStudents, major, minGpa, yearLevel, selectedSkills]);

  const activeFilterCount =
    (major.trim() ? 1 : 0) +
    (minGpa !== '' ? 1 : 0) +
    (yearLevel ? 1 : 0) +
    selectedSkills.length;

  const suggestedSkills = allSkills
    .filter((s) => !selectedSkills.includes(s) && s.toLowerCase().includes(skillInput.toLowerCase()))
    .slice(0, 5);

  const openStudent = (id: string) => {
    navigate(`/pi/students/${id}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      {loading ? (
        <div className="bs-page">
          <div className="bs-container">
            <div className="animate-pulse space-y-4">
              <div className="h-9 bg-slate-200 rounded w-64" />
              <div className="h-36 bg-slate-200 rounded-xl" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200 rounded-[10px]" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bs-page">
          <div className="bs-container">
            <header className="bs-header">
              <h1 className="bs-title">Students</h1>
              <p className="bs-subtitle">
                {allStudents.length} with a profile on ResearchHub: browse, open a profile, and reach out (e.g. email)
                to recruit. Your active hires are listed under Lab → Roster.
              </p>
            </header>

            <div className="bs-filters">
              <div className="bs-filter-row">
                <div className="bs-filter-group">
                  <label className="bs-filter-label">Major</label>
                  <input
                    className="bs-input"
                    placeholder="Filter by major…"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                  />
                </div>
                <div className="bs-filter-group">
                  <label className="bs-filter-label">Min GPA</label>
                  <input
                    className="bs-input"
                    type="number"
                    step="0.01"
                    min={0}
                    max={4}
                    placeholder="0.00"
                    value={minGpa}
                    onChange={(e) => setMinGpa(e.target.value)}
                  />
                </div>
                <div className="bs-filter-group">
                  <label className="bs-filter-label">Skills</label>
                  <input
                    className="bs-input"
                    placeholder="Type to add skills…"
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
                    <div className="bs-skill-dropdown">
                      {suggestedSkills.map((s) => (
                        <div key={s} className="bs-skill-option" onClick={() => addSkill(s)} role="option">
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bs-filter-group">
                  <label className="bs-filter-label">Year</label>
                  <select className="bs-select" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                    {YEAR_OPTIONS.map((o) => (
                      <option key={o.value || 'any'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <button type="button" className="bs-reset" onClick={resetFilters}>
                    Reset ({activeFilterCount})
                  </button>
                )}
              </div>
              {selectedSkills.length > 0 && (
                <div className="bs-active-filters">
                  {selectedSkills.map((s) => (
                    <span key={s} className="bs-skill-pill">
                      {s}
                      <span
                        className="bs-skill-pill-x"
                        role="button"
                        tabIndex={0}
                        onClick={() => removeSkill(s)}
                        onKeyDown={(e) => e.key === 'Enter' && removeSkill(s)}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bs-results-meta">
              {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
            </div>

            <div className="bs-cards">
              {filtered.length === 0 ? (
                <div className="bs-empty">No students match your filters. Try adjusting or clearing filters.</div>
              ) : (
                filtered.map((s) => {
                  const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
                  const incomplete = isProfileIncomplete(s);
                  const metaParts = [
                    s.major?.trim(),
                    formatYearLabel(s.yearLevel || undefined),
                    s.graduationYear != null ? `Class of ${s.graduationYear}` : '',
                  ].filter(Boolean);
                  const metaLine = metaParts.join(' · ');

                  return (
                    <div
                      key={s.id}
                      className="bs-card"
                      role="link"
                      tabIndex={0}
                      onClick={() => openStudent(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openStudent(s.id);
                        }
                      }}
                    >
                      <div className="bs-card-top">
                        <div className="bs-card-name">{name}</div>
                        <div className="bs-card-gpa-wrap">
                          {s.gpa != null ? (
                            <>
                              <span className="bs-card-gpa-label">GPA</span>
                              <span className="bs-card-gpa-val">{Number(s.gpa).toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="bs-card-gpa-empty">N/A</span>
                          )}
                        </div>
                      </div>

                      {incomplete ? (
                        <>
                          <p className="bs-incomplete">Profile incomplete</p>
                          <div className="bs-footer">
                            <div />
                            {s.email ? (
                              <a
                                href={`mailto:${s.email}`}
                                className="bs-email"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {s.email}
                              </a>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <>
                          {metaLine ? (
                            <div className="bs-meta-line">
                              <GraduationCap size={16} strokeWidth={2} aria-hidden />
                              <span>{metaLine}</span>
                            </div>
                          ) : null}
                          {s.bio?.trim() ? <p className="bs-bio">{s.bio}</p> : null}
                          <div className="bs-footer">
                            <div className="bs-chips">
                              {(s.skills || []).map((sk) => (
                                <span
                                  key={sk}
                                  className={`bs-chip ${
                                    selectedSkills.some((f) => sk.toLowerCase().includes(f.toLowerCase()))
                                      ? 'matched'
                                      : ''
                                  }`}
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                            {s.email ? (
                              <a
                                href={`mailto:${s.email}`}
                                className="bs-email"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {s.email}
                              </a>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
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
