export type ResearchPositionStatus = 'open' | 'closed' | 'filled';
export type ApplicationStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
export type CompensationType = 'paid' | 'unpaid' | 'credit' | 'stipend';

export interface ResearchPosition {
  id: string;
  professorId: string;
  title: string;
  description: string;
  department: string;
  university: string;
  requiredSkills: string[];
  preferredSkills: string[];
  compensationType: CompensationType;
  compensationDetails?: string;
  hoursPerWeek: number;
  startDate?: string;
  endDate?: string;
  applicationDeadline?: string;
  maxApplicants?: number;
  status: ResearchPositionStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  positionId: string;
  studentId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  answers?: Record<string, string>;
  professorNotes?: string;
  appliedAt: string;
  updatedAt: string;
}
