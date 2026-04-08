import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

// POST /api/applications - apply (student only)
router.post('/', authMiddleware, requireRole('student'), asyncHandler(async (req: Request, res: Response) => {
  const { positionId, coverLetter, personalStatement } = req.body;
  if (!positionId) {
    return res.status(400).json({ error: 'positionId is required' });
  }
  const studentResult = await pool.query('SELECT id FROM student_profiles WHERE user_id = $1', [req.userId]);
  const student = studentResult.rows[0];
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found' });
  }
  const statement = personalStatement ?? coverLetter ?? null;
  try {
    const result = await pool.query(
      `INSERT INTO applications (position_id, student_id, personal_statement)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [positionId, student.id, statement]
    );
    const row = result.rows[0];
    return res.status(201).json({
      id: row.id,
      positionId: row.position_id,
      studentId: row.student_id,
      status: row.status,
      coverLetter: row.personal_statement,
      personalStatement: row.personal_statement,
      appliedAt: row.created_at,
    });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Already applied to this position' });
    }
    throw err;
  }
}));

// GET /api/applications/mine - student's apps
router.get('/mine', authMiddleware, requireRole('student'), asyncHandler(async (req: Request, res: Response) => {
  const studentResult = await pool.query('SELECT id FROM student_profiles WHERE user_id = $1', [req.userId]);
  const student = studentResult.rows[0];
  if (!student) {
    return res.json([]);
  }
  const result = await pool.query(
    `SELECT a.*, rp.title as position_title, pp.lab_name
     FROM applications a
     JOIN research_positions rp ON rp.id = a.position_id
     JOIN pi_profiles pp ON pp.id = rp.pi_id
     WHERE a.student_id = $1
     ORDER BY a.created_at DESC`,
    [student.id]
  );
  return res.json(
    result.rows.map((row) => ({
      id: row.id,
      positionId: row.position_id,
      studentId: row.student_id,
      status: row.status,
      coverLetter: row.personal_statement,
      personalStatement: row.personal_statement,
      appliedAt: row.created_at,
      positionTitle: row.position_title,
      labName: row.lab_name,
    }))
  );
}));

// GET /api/applications/position/:id - apps for position (owner PI only)
router.get('/position/:id', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const { id: positionId } = req.params;
  const piResult = await pool.query('SELECT id FROM pi_profiles WHERE user_id = $1', [req.userId]);
  const pi = piResult.rows[0];
  if (!pi) {
    return res.status(404).json({ error: 'PI profile not found' });
  }
  const result = await pool.query(
    `SELECT a.*, sp.major, sp.gpa, sp.skills, sp.bio, sp.resume_url, sp.academic_level,
            u.id as student_user_id, u.first_name, u.last_name, u.email
     FROM applications a
     JOIN research_positions rp ON rp.id = a.position_id
     JOIN student_profiles sp ON sp.id = a.student_id
     JOIN users u ON u.id = sp.user_id
     WHERE a.position_id = $1 AND rp.pi_id = $2
     ORDER BY a.created_at DESC`,
    [positionId, pi.id]
  );
  return res.json(
    result.rows.map((row) => ({
      id: row.id,
      positionId: row.position_id,
      studentId: row.student_id,
      studentUserId: row.student_user_id,
      status: row.status,
      coverLetter: row.personal_statement,
      personalStatement: row.personal_statement,
      appliedAt: row.created_at,
      major: row.major,
      gpa: row.gpa ? parseFloat(row.gpa) : null,
      skills: row.skills || [],
      bio: row.bio,
      resumeUrl: row.resume_url,
      yearLevel: row.academic_level,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
    }))
  );
}));

// PATCH /api/applications/:id/status - update status (PI only)
router.patch('/:id/status', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'reviewing', 'accepted', 'rejected', 'withdrawn'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Valid status required: ${validStatuses.join(', ')}` });
  }
  const piResult = await pool.query('SELECT id FROM pi_profiles WHERE user_id = $1', [req.userId]);
  const pi = piResult.rows[0];
  if (!pi) {
    return res.status(404).json({ error: 'PI profile not found' });
  }
  const result = await pool.query(
    `UPDATE applications a
     SET status = $1
     FROM research_positions rp
     WHERE a.position_id = rp.id AND rp.pi_id = $2 AND a.id = $3
     RETURNING a.*`,
    [status, pi.id, id]
  );
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Application not found or access denied' });
  }
  return res.json({
    id: row.id,
    positionId: row.position_id,
    studentId: row.student_id,
    status: row.status,
    coverLetter: row.personal_statement,
    personalStatement: row.personal_statement,
    appliedAt: row.created_at,
  });
}));

export default router;
