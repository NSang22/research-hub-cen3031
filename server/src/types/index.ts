export type UserRole = 'student' | 'pi' | 'admin';
export type YearLevel = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad';
export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  created_at: string;
}

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
