// ---------------------------------------------------------------------------
// Application — mirrors the applications table in Supabase
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

/** Statuses from which a student may withdraw their application. */
export const WITHDRAWABLE_STATUSES: ApplicationStatus[] = ['pending', 'reviewing'];

export interface Application {
  id: string;
  student_id: string;
  position_id: string;
  personal_statement: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Application row enriched with position metadata for the student-facing
 * "my applications" list view.
 */
export interface ApplicationWithPosition extends Application {
  position_title: string;
  position_department: string;
}
