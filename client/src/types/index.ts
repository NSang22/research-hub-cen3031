import type { ApplicationQuestion, QuestionAnswersMap } from './applicationQuestions';

export type { ApplicationQuestion, QuestionAnswersMap } from './applicationQuestions';

export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export type UserRole = 'student' | 'pi';
export type AcademicLevel = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad' | 'masters' | 'phd' | 'postdoc';
/** @deprecated Use AcademicLevel */
export type YearLevel = AcademicLevel;
export type ApplicationStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
export type PositionStatus = 'open' | 'closed' | 'filled';
export type CompensationType = 'paid' | 'unpaid' | 'credit' | 'stipend';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface StudentProfile {
  id: string;
  userId?: string;
  major: string | null;
  gpa: number | null;
  graduationYear: number | null;
  skills: string[];
  bio: string | null;
  resumeUrl: string | null;
  /** Maps to academic_level in DB */
  yearLevel: AcademicLevel | null;
  interests?: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
  profileLinks?: ProfileLink[];
}

/** PI lab roster: students with an accepted application to one of this PI's positions */
export interface LabRosterMember extends StudentProfile {
  acceptedPositionTitles: string[];
  /** ISO timestamp: earliest acceptance update for this PI's positions */
  inLabSince: string;
}

export interface PIProfile {
  id: string;
  userId?: string;
  name?: string | null;
  department: string | null;
  labName: string | null;
  /** Joined string from research_areas[] for backwards compatibility */
  researchArea: string | null;
  researchAreas?: string[];
  labWebsite: string | null;
  staffingNeeds?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface LabMetrics {
  labName: string | null;
  department: string | null;
  totalPositions: number;
  positionsByStatus: Record<PositionStatus, number>;
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  avgTimeToFill: number | null;
  totalEnrolled: number;
  recentPositions: Array<{
    id: string;
    title: string;
    status: PositionStatus;
    compensationType: CompensationType;
    createdAt: string;
    applicationCount: number;
  }>;
}

export interface Position {
  id: string;
  piId: string;
  title: string;
  description: string | null;
  requiredSkills: string[];
  minGpa: number | null;
  /** True when compensationType is 'paid' or 'stipend' */
  isFunded: boolean;
  compensationType?: CompensationType;
  /** True when status is 'open' */
  isOpen: boolean;
  status?: PositionStatus;
  timeCommitment?: string | null;
  qualifications?: string | null;
  createdAt: string;
  deadline: string | null;
  department?: string;
  labName?: string;
  researchArea?: string;
  labWebsite?: string;
  /** Present on position detail (from PI user record) */
  piFirstName?: string;
  piLastName?: string;
  /** Custom questions applicants answer (set by PI) */
  applicationQuestions?: ApplicationQuestion[];
}

export interface Application {
  id: string;
  positionId: string;
  studentId: string;
  status: ApplicationStatus;
  /** Maps to personal_statement in DB */
  coverLetter: string | null;
  personalStatement?: string | null;
  appliedAt: string;
  positionTitle?: string;
  labName?: string;
  department?: string | null;
  questionAnswers?: QuestionAnswersMap;
}
