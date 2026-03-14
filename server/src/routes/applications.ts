import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import {
  getMyApplications,
  getApplicationById,
  submitApplication,
  withdrawApplication,
} from '../controllers/applicationController';

const router = Router();

/**
 * GET /api/applications/mine
 * Get all applications for a student.
 * Returns applications enriched with position title and department.
 *
 * Query params:
 *   student_id  string (uuid, required) — the student_profiles.id of the caller
 *
 * NOTE: /mine must be registered before /:id so Express does not
 *       interpret the literal string "mine" as a dynamic :id segment.
 */
router.get('/mine', getMyApplications);

/**
 * GET /api/applications/:id
 * Retrieve a single application by its primary key.
 */
router.get('/:id', getApplicationById);

/**
 * POST /api/applications
 * Submit a new application to a research position.
 *
 * Body:
 *   student_id         string (uuid, required) — references student_profiles.id
 *   position_id        string (uuid, required) — references research_positions.id
 *   personal_statement string (optional)       — cover letter / statement of interest
 */
router.post(
  '/',
  validateBody([
    { field: 'student_id',  required: true, type: 'uuid',   label: 'student_id' },
    { field: 'position_id', required: true, type: 'uuid',   label: 'position_id' },
    { field: 'personal_statement', type: 'string', label: 'personal_statement' },
  ]),
  submitApplication
);

/**
 * PUT /api/applications/:id/withdraw
 * Withdraw a pending or reviewing application.
 * Returns 409 if the application is already accepted, rejected, or withdrawn.
 */
router.put('/:id/withdraw', withdrawApplication);

export default router;
