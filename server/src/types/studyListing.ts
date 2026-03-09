// ---------------------------------------------------------------------------
// StudyListing — mirrors the study_listings table in Supabase
// ---------------------------------------------------------------------------

export type StudyStatus = 'recruiting' | 'closed' | 'completed';

export const STUDY_STATUSES: StudyStatus[] = ['recruiting', 'closed', 'completed'];

export interface StudyListing {
  id: string;
  pi_id: string;
  title: string;
  eligibility_criteria: string | null;
  compensation_details: string | null;
  scheduling_options: Record<string, unknown>;
  status: StudyStatus;
  created_at: string;
  updated_at: string;
}

// Fields the caller may include when creating a study listing
export type CreateStudyBody = {
  pi_id: string;
  title: string;
  eligibility_criteria?: string;
  compensation_details?: string;
  scheduling_options?: Record<string, unknown>;
};

// Fields the caller may include when updating a study listing
export type UpdateStudyBody = Partial<
  Pick<StudyListing, 'title' | 'eligibility_criteria' | 'compensation_details' | 'scheduling_options' | 'status'>
>;

export const UPDATE_ALLOWED_FIELDS: (keyof UpdateStudyBody)[] = [
  'title',
  'eligibility_criteria',
  'compensation_details',
  'scheduling_options',
  'status',
];
