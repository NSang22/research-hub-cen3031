import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { ProfileLinksDisplay } from '../../components/ProfileLinksDisplay';
import { api } from '../../lib/api';
import type { AcademicLevel, StudentProfile } from '../../types';
import './student-detail-pi.css';

function initials(first?: string, last?: string): string {
  const a = (first?.[0] || '').toUpperCase();
  const b = (last?.[0] || '').toUpperCase();
  return a + b || '?';
}

function formatYearLabel(yl: string | null | undefined): string {
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

function displayValue(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return 'N/A';
  return String(v);
}

function isBioEmpty(bio: string | null | undefined): boolean {
  if (bio == null) return true;
  const t = bio.trim();
  return t.length === 0 || t.toLowerCase() === 'hello';
}

export function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.students
      .getById(id)
      .then(setStudent)
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="sd-page">
          <div className="sd-inner">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-48 bg-slate-200 rounded-[10px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="sd-page">
          <div className="sd-inner">
            <Link to="/pi/students" className="sd-back">
              ← Back to students
            </Link>
            <p className="text-[15px] text-[#3d4260]">Student not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const name = [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Student';
  const email = student.email ?? '';
  const yearVal = formatYearLabel(student.yearLevel as AcademicLevel | null | undefined);
  const gradVal =
    student.graduationYear != null ? String(student.graduationYear) : 'N/A';
  const majorVal = displayValue(student.major);
  const gpaVal = student.gpa != null ? Number(student.gpa).toFixed(1) : 'N/A';
  const yearDisplay = yearVal || 'N/A';

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="sd-page">
        <div className="sd-inner">
          <Link to="/pi/students" className="sd-back">
            ← Back to students
          </Link>

          <div className="sd-card">
            <header className="sd-header">
              <div className="sd-header-row1">
                <div className="sd-avatar" aria-hidden>
                  {initials(student.firstName, student.lastName)}
                </div>
                <h1 className="sd-name">{name}</h1>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                {email ? (
                  <a href={`mailto:${email}`} className="sd-email">
                    {email}
                  </a>
                ) : null}
                {student.userId ? (
                  <Link
                    to={`/messages?composeTo=${encodeURIComponent(student.userId)}&composeName=${encodeURIComponent(name)}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors w-fit"
                  >
                    New message
                  </Link>
                ) : null}
              </div>
            </header>

            <section className="sd-grid-section" aria-label="Student information">
              <div className="sd-grid">
                <div>
                  <p className="sd-cell-label">Major</p>
                  <p className="sd-cell-value">{majorVal}</p>
                </div>
                <div>
                  <p className="sd-cell-label">GPA</p>
                  <p className="sd-cell-value">{gpaVal}</p>
                </div>
                <div>
                  <p className="sd-cell-label">Year Level</p>
                  <p className="sd-cell-value">{yearDisplay}</p>
                </div>
                <div>
                  <p className="sd-cell-label">Graduation Year</p>
                  <p className="sd-cell-value">{gradVal}</p>
                </div>
              </div>
            </section>

            <section className="sd-skills-section" aria-label="Skills">
              <h2 className="sd-section-label">Skills</h2>
              {student.skills && student.skills.length > 0 ? (
                <div className="sd-skills-row">
                  {student.skills.map((s) => (
                    <span key={s} className="sd-skill-chip">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="sd-about-section" aria-label="About">
              <h2 className="sd-section-label">About</h2>
              {isBioEmpty(student.bio) ? (
                <p className="sd-about-placeholder">No bio provided</p>
              ) : (
                <p className="sd-about-text">{student.bio}</p>
              )}
              {student.resumeUrl ? (
                <div className="sd-resume-wrap">
                  <a
                    href={student.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sd-resume-link"
                  >
                    View Resume →
                  </a>
                </div>
              ) : null}
            </section>

            <ProfileLinksDisplay links={student.profileLinks || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
