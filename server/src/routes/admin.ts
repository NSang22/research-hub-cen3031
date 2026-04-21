import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { logAudit } from '../lib/audit.js';
import { parseProfileLinks } from '../lib/profileLinks.js';

const router = Router();

/**
 * GET /api/admin/pis
 *
 * List all PIs associated with this lab administrator.
 */
router.get('/pis', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
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
 *
 * Lab-scoped recruitment metrics, filtered to PIs whose lab_admin_id = current user.
 * Optional query filters: startDate, endDate, positionType, piId.
 */
router.get('/metrics', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, positionType, piId } = req.query as Record<string, string | undefined>;

  //Base: only positions belonging to PIs in this lab
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

  //Position counts
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

  //Application counts (scoped to same position set)
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

  //Average days to fill (closed/filled positions)
  const timeToFill = await pool.query(
    `SELECT AVG(
       EXTRACT(EPOCH FROM (rp.updated_at - rp.created_at)) / 86400
     )::numeric(10,1) AS avg_days
     FROM research_positions rp
     JOIN pi_profiles pip ON pip.id = rp.pi_id
     ${where} AND rp.status IN ('closed','filled')`,
    params
  );

  //Total enrolled students in this lab
  const enrolled = await pool.query(
    `SELECT COUNT(DISTINCT a.student_id)::int AS total_enrolled
     FROM applications a
     ${appWhere} AND a.status = 'accepted'`,
    params
  );

  //PI count in this lab
  const piCount = await pool.query(
    `SELECT COUNT(*)::int AS total FROM pi_profiles WHERE lab_admin_id = $1`,
    [req.userId]
  );

  //Recent 15 positions in this lab
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

  //Per-PI breakdown — respects positionType / date filters but always shows all PIs in lab
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
       AND rp.id IN (SELECT rp2.id FROM research_positions rp2
                     JOIN pi_profiles pip2 ON pip2.id = rp2.pi_id
                     ${where})
     LEFT JOIN applications a ON a.position_id = rp.id
     WHERE pip.lab_admin_id = $1
     GROUP BY pip.id, u.first_name, u.last_name, pip.department
     ORDER BY application_count DESC`,
    params
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

/**
 * GET /api/admin/lab
 *
 * Returns the shared lab settings (department, lab_name, lab_website)
 * derived from PIs associated with this administrator.
 * Falls back to nulls if no PIs are associated yet.
 */
router.get('/lab', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT department, lab_name, lab_website
     FROM pi_profiles
     WHERE lab_admin_id = $1
     LIMIT 1`,
    [req.userId]
  );

  const row = result.rows[0];
  return res.json({
    department: row?.department ?? null,
    labName: row?.lab_name ?? null,
    labWebsite: row?.lab_website ?? null,
  });
}));

/**
 * PUT /api/admin/lab
 *
 * Updates department, lab_name, and lab_website for every PI
 * associated with this lab administrator.
 */
router.put('/lab', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { department, labName, labWebsite } = req.body as {
    department?: string;
    labName?: string;
    labWebsite?: string;
  };

  await pool.query(
    `UPDATE pi_profiles
     SET department  = $1,
         lab_name    = $2,
         lab_website = $3
     WHERE lab_admin_id = $4`,
    [
      department?.trim() || null,
      labName?.trim() || null,
      labWebsite?.trim() || null,
      req.userId,
    ]
  );

  return res.json({
    department: department?.trim() || null,
    labName: labName?.trim() || null,
    labWebsite: labWebsite?.trim() || null,
  });
}));

// ---------------------------------------------------------------------------
// PBI-27: Read-only access for lab admins — students & applications
// ---------------------------------------------------------------------------

router.get('/students', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { studentId, major, minGpa, skills, yearLevel } = req.query as Record<string, string | undefined>;
  const skillArr = skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const filters: string[] = [
    `EXISTS (SELECT 1 FROM applications a JOIN research_positions rp ON rp.id = a.position_id JOIN pi_profiles pip ON pip.id = rp.pi_id WHERE a.student_id = sp.id AND pip.lab_admin_id = $1)`,
  ];
  const params: unknown[] = [req.userId!];
  let idx = 2;
  if (studentId)               { filters.push(`sp.id = $${idx++}`);                  params.push(studentId); }
  if (major)                   { filters.push(`sp.major ILIKE $${idx++}`);            params.push(`%${major}%`); }
  if (minGpa)                  { filters.push(`sp.gpa >= $${idx++}`);                 params.push(parseFloat(minGpa)); }
  if (skillArr && skillArr.length > 0) { filters.push(`sp.skills && $${idx++}::text[]`); params.push(skillArr); }
  if (yearLevel)               { filters.push(`sp.academic_level = $${idx++}`);       params.push(yearLevel); }
  const where = `WHERE ${filters.join(' AND ')}`;
  const result = await pool.query(
    `SELECT sp.*, u.first_name, u.last_name, u.email
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     ${where}
     ORDER BY sp.updated_at DESC`,
    params
  );
  logAudit({ adminId: req.userId!, action: 'search', resourceType: 'student_profile', resourceId: 'search', metadata: { filters: { studentId, major, minGpa, skills, yearLevel } } }, req);
  return res.json(result.rows.map((row) => ({
    id: row.id, userId: row.user_id, major: row.major,
    gpa: row.gpa ? parseFloat(row.gpa) : null, graduationYear: row.graduation_year,
    skills: row.skills || [], bio: row.bio, resumeUrl: row.resume_url,
    yearLevel: row.academic_level, interests: row.interests || [],
    firstName: row.first_name, lastName: row.last_name, email: row.email,
    profileLinks: parseProfileLinks(row.profile_links),
  })));
}));

router.get('/students/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT sp.*, u.first_name, u.last_name, u.email
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.id = $1
       AND EXISTS (
         SELECT 1 FROM applications a
         JOIN research_positions rp ON rp.id = a.position_id
         JOIN pi_profiles pip ON pip.id = rp.pi_id
         WHERE a.student_id = sp.id AND pip.lab_admin_id = $2
       )`,
    [id, req.userId!]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: 'Student not found or access denied' });
  logAudit({ adminId: req.userId!, action: 'view', resourceType: 'student_profile', resourceId: id }, req);
  return res.json({
    id: row.id, userId: row.user_id, major: row.major,
    gpa: row.gpa ? parseFloat(row.gpa) : null, graduationYear: row.graduation_year,
    skills: row.skills || [], bio: row.bio, resumeUrl: row.resume_url,
    yearLevel: row.academic_level, interests: row.interests || [],
    firstName: row.first_name, lastName: row.last_name, email: row.email,
    profileLinks: parseProfileLinks(row.profile_links),
  });
}));

router.get('/students/:id/resume', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT sp.resume_url, u.first_name
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.id = $1
       AND EXISTS (
         SELECT 1 FROM applications a
         JOIN research_positions rp ON rp.id = a.position_id
         JOIN pi_profiles pip ON pip.id = rp.pi_id
         WHERE a.student_id = sp.id AND pip.lab_admin_id = $2
       )`,
    [id, req.userId!]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: 'Student not found or access denied' });
  if (!row.resume_url) return res.status(404).json({ error: 'No resume uploaded' });
  logAudit({ adminId: req.userId!, action: 'export', resourceType: 'student_profile', resourceId: id, metadata: { resource: 'resume' } }, req);
  const filename = `${(row.first_name as string)?.toLowerCase().replace(/\s+/g, '_') || 'student'}_resume.pdf`;
  return res.json({ resumeUrl: row.resume_url, filename });
}));

router.get('/applications', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { applicationId, positionId } = req.query as Record<string, string | undefined>;
  let query = `SELECT a.*, sp.major, sp.gpa, sp.skills, sp.bio, sp.resume_url, sp.academic_level,
    u.id AS student_user_id, u.first_name, u.last_name, u.email,
    rp.title AS position_title, rp.id AS position_id, pip.lab_name, pip.department
   FROM applications a
   JOIN research_positions rp ON rp.id = a.position_id
   JOIN pi_profiles pip ON pip.id = rp.pi_id
   JOIN student_profiles sp ON sp.id = a.student_id
   JOIN users u ON u.id = sp.user_id
   WHERE pip.lab_admin_id = $1`;
  const params: unknown[] = [req.userId!];
  if (applicationId) { params.push(applicationId); query += ` AND a.id = $${params.length}`; }
  if (positionId)    { params.push(positionId);    query += ` AND a.position_id = $${params.length}`; }
  query += ' ORDER BY a.created_at DESC';
  const result = await pool.query(query, params);
  logAudit({ adminId: req.userId!, action: 'search', resourceType: 'application', resourceId: 'search', metadata: { filters: { applicationId, positionId } } }, req);
  return res.json(result.rows.map((row) => ({
    id: row.id, positionId: row.position_id, studentId: row.student_id,
    studentUserId: row.student_user_id, status: row.status,
    coverLetter: row.personal_statement, personalStatement: row.personal_statement,
    appliedAt: row.created_at, major: row.major,
    gpa: row.gpa ? parseFloat(row.gpa) : null, skills: row.skills || [],
    bio: row.bio, resumeUrl: row.resume_url, yearLevel: row.academic_level,
    firstName: row.first_name, lastName: row.last_name, email: row.email,
    positionTitle: row.position_title, labName: row.lab_name, department: row.department,
    questionAnswers: row.question_answers || {},
  })));
}));

router.get('/applications/:id', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT a.*, sp.major, sp.gpa, sp.skills, sp.bio, sp.resume_url, sp.academic_level,
       u.id AS student_user_id, u.first_name, u.last_name, u.email,
       rp.title AS position_title, rp.id AS position_id, pip.lab_name, pip.department
     FROM applications a
     JOIN research_positions rp ON rp.id = a.position_id
     JOIN pi_profiles pip ON pip.id = rp.pi_id
     JOIN student_profiles sp ON sp.id = a.student_id
     JOIN users u ON u.id = sp.user_id
     WHERE a.id = $1 AND pip.lab_admin_id = $2`,
    [id, req.userId!]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: 'Application not found or access denied' });
  logAudit({ adminId: req.userId!, action: 'view', resourceType: 'application', resourceId: id }, req);
  return res.json({
    id: row.id, positionId: row.position_id, studentId: row.student_id,
    studentUserId: row.student_user_id, status: row.status,
    coverLetter: row.personal_statement, personalStatement: row.personal_statement,
    appliedAt: row.created_at, major: row.major,
    gpa: row.gpa ? parseFloat(row.gpa) : null, skills: row.skills || [],
    bio: row.bio, resumeUrl: row.resume_url, yearLevel: row.academic_level,
    firstName: row.first_name, lastName: row.last_name, email: row.email,
    positionTitle: row.position_title, labName: row.lab_name, department: row.department,
    questionAnswers: row.question_answers || {}, piNotes: row.pi_notes ?? null,
  });
}));

router.get('/audit-log', authMiddleware, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const limit  = Math.min(parseInt(req.query.limit  as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const result = await pool.query(
    `SELECT * FROM audit_log WHERE admin_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [req.userId!, limit, offset]
  );
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM audit_log WHERE admin_id = $1`,
    [req.userId!]
  );
  return res.json({
    entries: result.rows.map((row) => ({
      id: row.id, action: row.action, resourceType: row.resource_type,
      resourceId: row.resource_id, ipAddress: row.ip_address,
      createdAt: row.created_at, metadata: row.metadata,
    })),
    total: countResult.rows[0]?.total ?? 0,
    limit,
    offset,
  });
}));

export default router;
