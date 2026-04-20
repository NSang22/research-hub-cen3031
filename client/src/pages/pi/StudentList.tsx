import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Search,
  X,
  ArrowUpDown,
  MessageSquare,
  Send,
  ChevronDown,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import type { AcademicLevel, StudentProfile, Position } from '../../types';
import './student-browse.css';

// ─── constants ───────────────────────────────────────────────────────────────

const YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any level' },
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'grad', label: 'Grad' },
  { value: 'masters', label: 'Masters' },
  { value: 'phd', label: 'PhD' },
  { value: 'postdoc', label: 'Postdoc' },
];

const SORT_OPTIONS = [
  { value: 'match', label: 'Best match' },
  { value: 'gpa', label: 'GPA: high to low' },
  { value: 'name', label: 'Name A–Z' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['value'];

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatYearLabel(yl: AcademicLevel | null | undefined): string {
  if (!yl) return '';
  const map: Record<string, string> = {
    freshman: 'Freshman', sophomore: 'Sophomore', junior: 'Junior',
    senior: 'Senior', grad: 'Grad', masters: 'Masters', phd: 'PhD', postdoc: 'Postdoc',
  };
  return map[yl] || yl;
}

function isProfileIncomplete(s: StudentProfile): boolean {
  return !(
    Boolean(s.major?.trim()) || s.yearLevel != null || s.graduationYear != null ||
    Boolean(s.bio?.trim()) || (s.skills?.length ?? 0) > 0 || s.gpa != null
  );
}

/** Compute a 0–100 match score given the active filter criteria. */
function computeMatch(
  s: StudentProfile,
  { minGpa, selectedSkills, skillMode, yearLevel, major }: {
    minGpa: string;
    selectedSkills: string[];
    skillMode: 'any' | 'all';
    yearLevel: string;
    major: string;
  }
): number {
  let total = 0;
  let weight = 0;

  if (major.trim()) {
    weight += 25;
    if (s.major?.toLowerCase().includes(major.toLowerCase())) total += 25;
  }
  if (minGpa !== '') {
    const min = parseFloat(minGpa);
    weight += 25;
    if (s.gpa != null && s.gpa >= min) {
      // bonus for exceeding minimum
      total += Math.min(25, 20 + Math.round(((s.gpa - min) / (4 - min + 0.001)) * 5));
    }
  }
  if (yearLevel) {
    weight += 20;
    if (s.yearLevel === yearLevel) total += 20;
  }
  if (selectedSkills.length) {
    weight += 30;
    const studentSkills = (s.skills || []).map((sk) => sk.toLowerCase());
    const matched = selectedSkills.filter((f) =>
      studentSkills.some((sk) => sk.includes(f.toLowerCase()))
    ).length;
    if (skillMode === 'all') {
      total += Math.round((matched / selectedSkills.length) * 30);
    } else {
      total += matched > 0 ? 30 : 0;
    }
  }

  if (weight === 0) {
    // no filters — score by GPA
    return s.gpa != null ? Math.round((s.gpa / 4) * 100) : 50;
  }
  return Math.round((total / weight) * 100);
}

// ─── Invite to Apply modal ────────────────────────────────────────────────────

interface InviteModalProps {
  student: StudentProfile;
  positions: Position[];
  onClose: () => void;
}

function InviteModal({ student, positions, onClose }: InviteModalProps) {
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const openPositions = positions.filter((p) => p.isOpen || p.status === 'open');
  const selectedPosition = openPositions.find((p) => p.id === selectedPositionId);
  const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ') || 'there';

  const handleSend = async () => {
    if (!selectedPosition || !student.userId) return;
    setSending(true);
    setError('');
    try {
      const message =
        `Hi ${studentName},\n\nI came across your profile on ResearchHub and think you would be a great fit for my open position: "${selectedPosition.title}".\n\nI'd love to invite you to apply! Feel free to check it out on the platform and reach out if you have any questions.\n\nBest,`;
      await api.messages.send({ recipientId: student.userId, body: message });
      setSent(true);
    } catch {
      setError('Failed to send invite. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sb-modal-backdrop" onClick={onClose}>
      <motion.div
        className="sb-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="sb-modal-sent">
            <CheckCircle2 size={40} className="sb-sent-icon" />
            <p className="sb-sent-title">Invite sent!</p>
            <p className="sb-sent-sub">
              {studentName} received a message about "{selectedPosition?.title}".
            </p>
            <button className="sb-btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="sb-modal-header">
              <h2 className="sb-modal-title">Invite to Apply</h2>
              <button className="sb-modal-close" onClick={onClose}><X size={18} /></button>
            </div>
            <p className="sb-modal-sub">
              Select one of your open positions to invite <strong>{studentName}</strong> to apply.
            </p>

            {openPositions.length === 0 ? (
              <p className="sb-modal-empty">You have no open positions right now.</p>
            ) : (
              <div className="sb-position-list">
                {openPositions.map((pos) => (
                  <label key={pos.id} className={`sb-position-option ${selectedPositionId === pos.id ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="position"
                      value={pos.id}
                      checked={selectedPositionId === pos.id}
                      onChange={() => setSelectedPositionId(pos.id)}
                    />
                    <div className="sb-position-info">
                      <span className="sb-position-title">{pos.title}</span>
                      {pos.department && <span className="sb-position-dept">{pos.department}</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {error && <p className="sb-modal-error">{error}</p>}

            <div className="sb-modal-actions">
              <button className="sb-btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="sb-btn-primary"
                disabled={!selectedPositionId || sending}
                onClick={handleSend}
              >
                {sending ? <Loader2 size={15} className="sb-spin" /> : <Send size={15} />}
                {sending ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Match score badge ────────────────────────────────────────────────────────

function MatchBadge({ score, hasFilters }: { score: number; hasFilters: boolean }) {
  if (!hasFilters) return null;
  const color =
    score >= 80 ? '#2f9e44' :
    score >= 55 ? '#e67700' :
    '#868e96';
  return (
    <div className="sb-match" style={{ color, borderColor: color + '44' }}>
      <span className="sb-match-pct">{score}%</span>
      <span className="sb-match-label">match</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function StudentList() {
  const navigate = useNavigate();

  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // filters
  const [major, setMajor] = useState('');
  const [minGpa, setMinGpa] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillMode, setSkillMode] = useState<'any' | 'all'>('any');

  // sort
  const [sort, setSort] = useState<SortKey>('match');

  // invite modal
  const [inviteStudent, setInviteStudent] = useState<StudentProfile | null>(null);

  // pagination
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initial load: fetch positions once
  useEffect(() => {
    api.positions.mine()
      .then((p) => setPositions(p as unknown as Position[]))
      .catch(() => setPositions([]));
  }, []);

  // server-side search with debounce
  const runSearch = useCallback((params: {
    major: string; minGpa: string; yearLevel: string; selectedSkills: string[];
  }) => {
    setSearching(true);
    setPage(1);
    const skillsParam = params.selectedSkills.join(',');
    api.students.list({
      major: params.major || undefined,
      minGpa: params.minGpa ? parseFloat(params.minGpa) : undefined,
      yearLevel: params.yearLevel || undefined,
      skills: skillsParam || undefined,
    })
      .then(setAllStudents)
      .catch(() => setAllStudents([]))
      .finally(() => { setSearching(false); setLoading(false); });
  }, []);

  // initial fetch
  useEffect(() => {
    runSearch({ major: '', minGpa: '', yearLevel: '', selectedSkills: [] });
  }, [runSearch]);

  // debounced re-fetch on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch({ major, minGpa, yearLevel, selectedSkills });
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [major, minGpa, yearLevel, selectedSkills, runSearch]);

  // skills autocomplete
  const allSkills = useMemo(
    () => [...new Set(allStudents.flatMap((s) => s.skills || []))].sort(),
    [allStudents]
  );
  const suggestedSkills = allSkills
    .filter((s) => !selectedSkills.includes(s) && s.toLowerCase().includes(skillInput.toLowerCase()))
    .slice(0, 6);

  const addSkill = (skill: string) => {
    if (skill && !selectedSkills.includes(skill)) setSelectedSkills([...selectedSkills, skill]);
    setSkillInput('');
  };
  const removeSkill = (skill: string) => setSelectedSkills(selectedSkills.filter((x) => x !== skill));
  const resetFilters = () => {
    setMajor(''); setMinGpa(''); setYearLevel('');
    setSkillInput(''); setSelectedSkills([]); setSkillMode('any');
  };

  const hasFilters = Boolean(major.trim()) || minGpa !== '' || Boolean(yearLevel) || selectedSkills.length > 0;
  const activeFilterCount =
    (major.trim() ? 1 : 0) + (minGpa !== '' ? 1 : 0) + (yearLevel ? 1 : 0) + selectedSkills.length;

  // scoring + sort (client-side on server results)
  const scored = useMemo(() =>
    allStudents.map((s) => ({
      student: s,
      score: computeMatch(s, { minGpa, selectedSkills, skillMode, yearLevel, major }),
      incomplete: isProfileIncomplete(s),
    })),
    [allStudents, minGpa, selectedSkills, skillMode, yearLevel, major]
  );

  const sorted = useMemo(() => {
    const list = [...scored];
    if (sort === 'match') {
      list.sort((a, b) => {
        if (a.incomplete !== b.incomplete) return a.incomplete ? 1 : -1;
        return b.score - a.score;
      });
    } else if (sort === 'gpa') {
      list.sort((a, b) => {
        const ga = a.student.gpa ?? -1;
        const gb = b.student.gpa ?? -1;
        return gb - ga;
      });
    } else {
      list.sort((a, b) => {
        const na = `${a.student.firstName || ''} ${a.student.lastName || ''}`.trim().toLowerCase();
        const nb = `${b.student.firstName || ''} ${b.student.lastName || ''}`.trim().toLowerCase();
        return na.localeCompare(nb);
      });
    }
    return list;
  }, [scored, sort]);

  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = sorted.length > paginated.length;

  const handleMessage = (s: StudentProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!s.userId) return;
    const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
    navigate(`/messages?composeTo=${s.userId}&composeName=${encodeURIComponent(name)}`);
  };

  const handleInvite = (s: StudentProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setInviteStudent(s);
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
              {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-slate-200 rounded-[10px]" />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="bs-page">
          <div className="bs-container">
            <header className="bs-header">
              <h1 className="bs-title">Find Students</h1>
              <p className="bs-subtitle">
                Search {allStudents.length > 0 ? `${allStudents.length} students` : 'students'} on ResearchHub by GPA, skills, major, and academic level. Click a card to view the full profile.
              </p>
            </header>

            {/* Filters */}
            <div className="bs-filters">
              <div className="bs-filter-row">
                <div className="bs-filter-group">
                  <label className="bs-filter-label">Major</label>
                  <div className="bs-input-icon-wrap">
                    <Search size={13} className="bs-input-icon" />
                    <input
                      className="bs-input bs-input-pl"
                      placeholder="e.g. Computer Science"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bs-filter-group">
                  <label className="bs-filter-label">Min GPA</label>
                  <input
                    className="bs-input"
                    type="number"
                    step="0.1"
                    min={0}
                    max={4}
                    placeholder="0.0"
                    value={minGpa}
                    onChange={(e) => setMinGpa(e.target.value)}
                  />
                </div>

                <div className="bs-filter-group">
                  <label className="bs-filter-label">Academic Level</label>
                  <select className="bs-select" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                    {YEAR_OPTIONS.map((o) => (
                      <option key={o.value || 'any'} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="bs-filter-group">
                  <label className="bs-filter-label">
                    Skills
                    <span className="bs-skill-mode-toggle">
                      <button
                        type="button"
                        className={`bs-mode-btn ${skillMode === 'any' ? 'active' : ''}`}
                        onClick={() => setSkillMode('any')}
                      >Any</button>
                      <button
                        type="button"
                        className={`bs-mode-btn ${skillMode === 'all' ? 'active' : ''}`}
                        onClick={() => setSkillMode('all')}
                      >All</button>
                    </span>
                  </label>
                  <div className="bs-input-icon-wrap" style={{ position: 'relative' }}>
                    <input
                      className="bs-input"
                      placeholder="Type to add a skill…"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && skillInput.trim()) {
                          e.preventDefault();
                          addSkill(suggestedSkills[0] || skillInput.trim());
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
                      >×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Results bar */}
            <div className="bs-results-bar">
              <span className="bs-results-meta">
                {searching
                  ? <><Loader2 size={13} className="sb-spin" style={{ display: 'inline', marginRight: 4 }} />Searching…</>
                  : <>{sorted.length} student{sorted.length !== 1 ? 's' : ''} found</>
                }
              </span>
              <div className="bs-sort-wrap">
                <ArrowUpDown size={13} />
                <select
                  className="bs-sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="bs-sort-chevron" />
              </div>
            </div>

            {/* Cards */}
            <div className="bs-cards">
              {sorted.length === 0 && !searching ? (
                <div className="bs-empty">
                  No students match your filters. Try adjusting or clearing filters.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {paginated.map(({ student: s, score, incomplete }) => {
                    const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
                    const metaParts = [
                      s.major?.trim(),
                      formatYearLabel(s.yearLevel || undefined),
                      s.graduationYear != null ? `Class of ${s.graduationYear}` : '',
                    ].filter(Boolean);
                    const metaLine = metaParts.join(' · ');

                    return (
                      <motion.div
                        key={s.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="bs-card"
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate(`/pi/students/${s.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/pi/students/${s.id}`);
                          }
                        }}
                      >
                        <div className="bs-card-top">
                          <div className="bs-card-name">{name}</div>
                          <div className="bs-card-right">
                            <MatchBadge score={score} hasFilters={hasFilters} />
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
                        </div>

                        {incomplete ? (
                          <p className="bs-incomplete">Profile not yet complete</p>
                        ) : (
                          <>
                            {metaLine && (
                              <div className="bs-meta-line">
                                <GraduationCap size={16} strokeWidth={2} aria-hidden />
                                <span>{metaLine}</span>
                              </div>
                            )}
                            {s.bio?.trim() && <p className="bs-bio">{s.bio}</p>}
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
                          </>
                        )}

                        {/* Actions */}
                        <div className="bs-card-actions">
                          <button
                            className="bs-action-btn"
                            title="Send message"
                            onClick={(e) => handleMessage(s, e)}
                          >
                            <MessageSquare size={14} />
                            Message
                          </button>
                          <button
                            className="bs-action-btn bs-action-invite"
                            title="Invite to apply"
                            onClick={(e) => handleInvite(s, e)}
                          >
                            <Send size={14} />
                            Invite to apply
                          </button>
                          {s.email && (
                            <a
                              href={`mailto:${s.email}`}
                              className="bs-email"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {s.email}
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', paddingTop: 24 }}>
                <button
                  className="bs-load-more"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Show more ({sorted.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite modal */}
      <AnimatePresence>
        {inviteStudent && (
          <InviteModal
            student={inviteStudent}
            positions={positions}
            onClose={() => setInviteStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
