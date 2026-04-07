/** User role: student, PI (principal investigator), or lab administrator */
export type UserRole = 'student' | 'pi' | 'admin';
/** Academic year level of a student */
export type YearLevel = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad';
/** Possible states of a research application */
export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected';

/** Authenticated user account */
/** Authenticated user account */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  created_at: string;
}

/** Student profile with academic and contact information */
export interface StudentProfile {
  id: string;
  user_id: string;
  major: string | null;
  gpa: number | null;
  graduation_year: number | null;
  skills: string[];
  bio: string | null;
  resume_url: string | null;
  year_level: YearLevel | null;
}

/** PI (Principal Investigator) profile with lab affiliation details */
export interface PIProfile {
  id: string;
  user_id: string;
  department: string | null;
  lab_name: string | null;
  research_area: string | null;
  lab_website: string | null;
}

export interface Position {
  id: string;
  pi_id: string;
  title: string;
  description: string | null;
  required_skills: string[];
  min_gpa: number | null;
  is_funded: boolean;
  is_open: boolean;
  created_at: string;
  deadline: string | null;
}

export interface Application {
  id: string;
  position_id: string;
  student_id: string;
  status: ApplicationStatus;
  cover_letter: string | null;
  applied_at: string;
}
