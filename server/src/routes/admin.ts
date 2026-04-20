import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(requireRole('admin'));

/**
 * GET /api/admin/pis
 * List all PIs associated with this lab administrator.
 */
router.get('/pis', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT
       pp.id,
       pp.user_id,
       pp.department,
       pp.lab_name,
       pp.research_areas,
       pp.lab_website,
       u.first_name,
       u.last_name,
       u.email,
       (SELECT COUNT(*)::int FROM research_positions rp WHERE rp.pi_id = pp.id) AS position_count,
       (SELECT COUNT(*)::int FROM research_positions rp
        JOIN applications a ON a.position_id = rp.id
        WHERE rp.pi_id = pp.id) AS application_count
     FROM pi_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.lab_admin_id = $1
     ORDER BY u.last_name, u.first_name`,
    [req.userId]
  );

  return res.json(
    result.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      department: r.department,
      labName: r.lab_name,
      researchAreas: r.research_areas || [],
      labWebsite: r.lab_website,
      positionCount: r.position_count,
      applicationCount: r.application_count,
    }))
  );
}));

/**
 * GET /api/admin/metrics
 * Lab-scoped recruitment metrics, filtered to PIs whose lab_admin_id = current user.
 * Optional query filters: startDate, endDate, positionType, piId.
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, positionType, piId } = req.query as Record<string, string | undefined>;

  // Base: only positions belonging to PIs in this lab
  const baseFilters: string[] = ['pip.lab_admin_id = $1'];
  const params: unknown[] = [req.userId];

  const addParam = (clause: string, val: unknown) => {
    params.push(val);
    baseFilters.push(clause.replace('?', `$${params.length}`));
  };

  if (startDate)    addParam('rp.created_at >= ?', startDate);
  if (endDate)      addParam('rp.created_at <= ?', endDate);
  if (positionType) addParam('rp.compensation_type = ?', positionType);
  if (piId)         addParam('pip.id = ?', piId);

  const where = `WHERE ${baseFilters.join(' AND ')}`;

  // Position counts
  const positionStats = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE rp.status = 'open')::int   AS open_count,
       COUNT(*) FILTER (WHERE rp.status = 'closed')::int AS closed_count,
       COUNT(*) FILTER (WHERE rp.status = 'filled')::int AS filled_count
     FROM research_positions rp
     JOIN pi_profiles pip ON pip.id = rp.pi_id
     ${where}`,
    params
  );

  // Application counts (scoped to same position set)
  const appWhere = `WHERE a.position_id IN (
    SELECT rp.id FROM research_positions rp
    JOIN pi_profiles pip ON pip.id = rp.pi_id
    ${where}
  )`;

  const appStats = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE a.status = 'pending')::int    AS pending_count,
       COUNT(*) FILTER (WHERE a.status = 'reviewing')::int  AS reviewed_count,
       COUNT(*) FILTER (WHERE a.status = 'accepted')::int   AS accepted_count,
       COUNT(*) FILTER (WHERE a.status = 'rejected')::int   AS rejected_count,
       COUNT(*) FILTER (WHERE a.status = 'withdrawn')::int  AS withdrawn_count
     FROM applications a
     ${appWhere}`,
    params
  );

  // Average days to fill (closed/filled positions)
  const timeToFill = await pool.query(
    `SELECT AVG(
       EXTRACT(EPOCH FROM (rp.updated_at - rp.created_at)) / 86400
     )::numeric(10,1) AS avg_days
     FROM research_positions rp
     JOIN pi_profiles pip ON pip.id = rp.pi_id
     ${where} AND rp.status IN ('closed','filled')`,
    params
  );

  // Total enrolled students in this lab
  const enrolled = await pool.query(
    `SELECT COUNT(DISTINCT a.student_id)::int AS total_enrolled
     FROM applications a
     ${appWhere} AND a.status = 'accepted'`,
    params
  );

  // PI count in this lab
  const piCount = await pool.query(
    `SELECT COUNT(*)::int AS total FROM pi_profiles WHERE lab_admin_id = $1`,
    [req.userId]
  );

  // Recent 15 positions in this lab
  const recentPositions = await pool.query(
    `SELECT
       rp.id,
       rp.title,
       rp.status,
       rp.created_at,
       pip.lab_name,
       pip.department,
       u.first_name AS pi_first_name,
       u.last_name  AS pi_last_name,
       (SELECT COUNT(*)::int FROM applications a2 WHERE a2.position_id = rp.id) AS application_count
     FROM research_positions rp
     JOIN pi_profiles pip ON pip.id = rp.pi_id
     JOIN users u ON u.id = pip.user_id
     ${where}
     ORDER BY rp.created_at DESC
     LIMIT 15`,
    params
  );

  // Per-PI breakdown
  const piBreakdown = await pool.query(
    `SELECT
       pip.id,
       u.first_name,
       u.last_name,
       pip.department,
       COUNT(DISTINCT rp.id)::int AS position_count,
       COUNT(a.id)::int           AS application_count,
       COUNT(a.id) FILTER (WHERE a.status = 'accepted')::int AS enrolled_count
     FROM pi_profiles pip
     JOIN users u ON u.id = pip.user_id
     LEFT JOIN research_positions rp ON rp.pi_id = pip.id
     LEFT JOIN applications a ON a.position_id = rp.id
     WHERE pip.lab_admin_id = $1
     GROUP BY pip.id, u.first_name, u.last_name, pip.department
     ORDER BY application_count DESC`,
    [req.userId]
  );

  return res.json({
    positions: positionStats.rows[0],
    applications: appStats.rows[0],
    avgDaysToFill: timeToFill.rows[0]?.avg_days ?? null,
    totalEnrolled: enrolled.rows[0]?.total_enrolled ?? 0,
    piCount: piCount.rows[0]?.total ?? 0,
    recentPositions: recentPositions.rows,
    piBreakdown: piBreakdown.rows,
  });
}));

export default router;
