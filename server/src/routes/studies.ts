import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import {
  listStudies,
  getStudyById,
  createStudy,
  updateStudy,
  closeStudy,
} from '../controllers/studyController';
import { STUDY_STATUSES } from '../types/studyListing';

const router = Router();

/**
 * GET /api/studies
 * List study listings. Defaults to status=recruiting.
 *
 * Query params:
 *   status  string (optional) — one of: recruiting, closed, completed
 *   pi_id   string (optional) — filter by PI profile id
 */
router.get('/', listStudies);

/**
 * GET /api/studies/:id
 * Retrieve a single study listing by its primary key.
 */
router.get('/:id', getStudyById);

/**
 * POST /api/studies
 * Create a new study listing.
 *
 * Body:
 *   pi_id                string (uuid, required)  — references pi_profiles.id
 *   title                string (required)        — study title
 *   eligibility_criteria string (optional)        — who can participate
 *   compensation_details string (optional)        — e.g. "$20 gift card"
 *   scheduling_options   object (optional)        — JSON scheduling metadata
 */
router.post(
  '/',
  validateBody([
    { field: 'pi_id',  required: true,  type: 'uuid',   label: 'pi_id' },
    { field: 'title',  required: true,  type: 'string', minLength: 1, label: 'title' },
    { field: 'eligibility_criteria', type: 'string', label: 'eligibility_criteria' },
    { field: 'compensation_details', type: 'string', label: 'compensation_details' },
    { field: 'scheduling_options',   type: 'object', label: 'scheduling_options' },
  ]),
  createStudy
);

/**
 * PUT /api/studies/:id
 * Update a study listing. All fields are optional; at least one must be provided.
 *
 * Body (all optional):
 *   title                string
 *   eligibility_criteria string
 *   compensation_details string
 *   scheduling_options   object
 *   status               enum (recruiting | closed | completed)
 */
router.put(
  '/:id',
  validateBody([
    { field: 'title',                type: 'string', minLength: 1, label: 'title' },
    { field: 'eligibility_criteria', type: 'string', label: 'eligibility_criteria' },
    { field: 'compensation_details', type: 'string', label: 'compensation_details' },
    { field: 'scheduling_options',   type: 'object', label: 'scheduling_options' },
    { field: 'status', type: 'enum', values: STUDY_STATUSES, label: 'status' },
  ]),
  updateStudy
);

/**
 * DELETE /api/studies/:id
 * Close a study listing (soft delete — sets status to 'closed').
 */
router.delete('/:id', closeStudy);

export default router;
