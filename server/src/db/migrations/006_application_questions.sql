-- Custom application questions on positions and answers on applications
ALTER TABLE research_positions
  ADD COLUMN IF NOT EXISTS application_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS question_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
