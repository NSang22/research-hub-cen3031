export type UserRole = 'student' | 'professor' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  university?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile extends User {
  role: 'student';
  major?: string;
  graduationYear?: number;
  gpa?: number;
  skills: string[];
  resumeUrl?: string;
}

export interface ProfessorProfile extends User {
  role: 'professor';
  title?: string;
  labName?: string;
  researchInterests: string[];
  publicationCount?: number;
}
