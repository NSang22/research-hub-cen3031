import type { ApplicationQuestion, QuestionAnswersMap } from './applicationQuestions';

export type { ApplicationQuestion, QuestionAnswersMap } from './applicationQuestions';

export type NotificationFrequency = 'immediately' | 'hourly' | 'daily' | 'weekly';

export interface NotificationPreferences {
  notifyNewPositions: boolean;
  notifyNewMessages: boolean;
  notificationKeywords: string[];
  notificationDepartments: string[];
  notificationFrequency: NotificationFrequency;
}

/** Raw shape from GET /api/messages/conversations (other participant row) */
export interface ConversationOtherParticipant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
}

export interface ConversationSummary {
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  otherParticipant: ConversationOtherParticipant | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  senderFirstName: string | null;
  senderLastName: string | null;
  senderRole: string;
}

export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

export type UserRole = 'student' | 'pi' | 'admin';
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
  /** UUID of the lab administrator this PI is associated with */
  labAdminId?: string | null;
  /** Display name of the associated lab administrator */
  labAdminName?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
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
  piUserId?: string;
  piFirstName?: string;
  piLastName?: string;
  /** Custom questions applicants answer (set by PI) */
  applicationQuestions?: ApplicationQuestion[];
}

export interface ConversationParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface Conversation {
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  otherParticipant: ConversationParticipant | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderRole?: UserRole;
}

/** A lab administrator user listed for PI association */
export interface LabAdminOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
}

/** A PI record as seen by a lab admin */
export interface LabPIMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  labName: string | null;
  researchAreas: string[];
  labWebsite: string | null;
  positionCount: number;
  applicationCount: number;
}

export interface AdminMetrics {
  positions: {
    total: number;
    open_count: number;
    closed_count: number;
    filled_count: number;
  };
  applications: {
    total: number;
    pending_count: number;
    reviewed_count: number;
    accepted_count: number;
    rejected_count: number;
    withdrawn_count: number;
  };
  avgDaysToFill: string | null;
  totalEnrolled: number;
  piCount: number;
  recentPositions: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    lab_name: string | null;
    department: string | null;
    pi_first_name: string;
    pi_last_name: string;
    application_count: number;
  }>;
  piBreakdown: Array<{
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    position_count: number;
    application_count: number;
    enrolled_count: number;
  }>;
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
