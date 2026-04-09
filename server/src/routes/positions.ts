import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

function rowToPosition(row: Record<string, unknown>) {
  const aq = row.application_questions;
  return {
    id: row.id,
    piId: row.pi_id,
    title: row.title,
    description: row.description,
    requiredSkills: (row.required_skills as string[]) || [],
    minGpa: row.min_gpa ? parseFloat(row.min_gpa as string) : null,
    isFunded: row.compensation_type === 'paid' || row.compensation_type === 'stipend',
    compensationType: row.compensation_type,
    isOpen: row.status === 'open',
    status: row.status,
    timeCommitment: row.time_commitment,
    qualifications: row.qualifications,
    createdAt: row.created_at,
    deadline: row.deadline,
    department: row.department,
    labName: row.lab_name,
    researchArea: (row.research_areas as string[] | undefined)?.join(', ') || null,
    labWebsite: row.lab_website,
    applicationQuestions: Array.isArray(aq) ? aq : [],
  };
}

// POST /api/positions - create (PI only)
router.post('/', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const { title, description, requiredSkills, minGpa, isFunded, compensationType, deadline, timeCommitment, qualifications, applicationQuestions } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const piResult = await pool.query('SELECT id FROM pi_profiles WHERE user_id = $1', [req.userId]);
  const pi = piResult.rows[0];
  if (!pi) {
    return res.status(404).json({ error: 'PI profile not found' });
  }
  const compType = compensationType ?? (isFunded ? 'paid' : 'unpaid');
  const aqJson = JSON.stringify(Array.isArray(applicationQuestions) ? applicationQuestions : []);

  const result = await pool.query(
    `INSERT INTO research_positions
       (pi_id, title, description, required_skills, min_gpa, compensation_type, deadline, time_commitment, qualifications, application_questions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING *`,
    [
      pi.id,
      title,
      description ?? null,
      requiredSkills ?? [],
      minGpa ?? null,
      compType,
      deadline ?? null,
      timeCommitment ?? null,
      qualifications ?? null,
      aqJson,
    ]
  );
  return res.status(201).json(rowToPosition(result.rows[0]));
}));

// GET /api/positions - list with filters (public)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { search, skills, isFunded, department } = req.query;
  let query = `
    SELECT rp.*, pp.department, pp.lab_name, pp.research_areas, pp.lab_website
    FROM research_positions rp
    JOIN pi_profiles pp ON pp.id = rp.pi_id
    WHERE rp.status = 'open'
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search && typeof search === 'string') {
    query += ` AND (rp.title ILIKE $${paramIndex} OR rp.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (skills && typeof skills === 'string') {
    const skillArr = skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillArr.length > 0) {
      query += ` AND rp.required_skills && $${paramIndex}::text[]`;
      params.push(skillArr);
      paramIndex++;
    }
  }
  if (isFunded === 'true') {
    query += ` AND rp.compensation_type IN ('paid', 'stipend')`;
  }
  if (department && typeof department === 'string') {
    query += ` AND pp.department ILIKE $${paramIndex}`;
    params.push(`%${department}%`);
    paramIndex++;
  }

  query += ' ORDER BY rp.created_at DESC';

  const result = await pool.query(query, params);
  return res.json(result.rows.map(rowToPosition));
}));

// GET /api/positions/mine - PI's own positions
router.get('/mine', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const piResult = await pool.query('SELECT id FROM pi_profiles WHERE user_id = $1', [req.userId]);
  const pi = piResult.rows[0];
  if (!pi) {
    return res.json([]);
  }
  const result = await pool.query(
    `SELECT rp.*,
       (SELECT COUNT(*) FROM applications a WHERE a.position_id = rp.id) as app_count
     FROM research_positions rp
     WHERE rp.pi_id = $1
     ORDER BY rp.created_at DESC`,
    [pi.id]
  );
  return res.json(
    result.rows.map((row) => ({
      ...rowToPosition(row),
      appCount: parseInt(row.app_count as string, 10),
    }))
  );
}));

// GET /api/positions/recommended - top matching open positions for the logged-in student
router.get('/recommended', authMiddleware, requireRole('student'), asyncHandler(async (req: Request, res: Response) => {
  const studentResult = await pool.query(
    'SELECT id, skills, gpa FROM student_profiles WHERE user_id = $1',
    [req.userId]
  );
  const student = studentResult.rows[0];
  if (!student) {
    return res.json([]);
  }

  const studentSkills: string[] = (student.skills as string[]) || [];
  const studentGpa: number | null = student.gpa != null ? parseFloat(student.gpa as string) : null;

  const result = await pool.query(
    `SELECT rp.*, pp.department, pp.lab_name, pp.research_areas, pp.lab_website
     FROM research_positions rp
     JOIN pi_profiles pp ON pp.id = rp.pi_id
     WHERE rp.status = 'open'
       AND rp.id NOT IN (
         SELECT position_id FROM applications WHERE student_id = $1
       )`,
    [student.id]
  );

  const scored = result.rows.map((row) => {
    const requiredSkills: string[] = (row.required_skills as string[]) || [];
    const minGpa: number | null = row.min_gpa != null ? parseFloat(row.min_gpa as string) : null;

    let skillScore = 0;
    if (requiredSkills.length === 0) {
      skillScore = 1;
    } else {
      const matchCount = requiredSkills.filter((s) =>
        studentSkills.some((ss) => ss.toLowerCase() === s.toLowerCase())
      ).length;
      skillScore = matchCount / requiredSkills.length;
    }

    let gpaScore = 0;
    if (minGpa === null) {
      gpaScore = 1;
    } else if (studentGpa !== null && studentGpa >= minGpa) {
      gpaScore = 1;
    } else if (studentGpa !== null) {
      gpaScore = Math.max(0, 1 - (minGpa - studentGpa) / minGpa);
    }

    return { row, score: skillScore * 0.7 + gpaScore * 0.3 };
  });

  scored.sort((a, b) => b.score - a.score);
  return res.json(scored.slice(0, 4).map(({ row }) => rowToPosition(row)));
}));

// GET /api/positions/:id - detail
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT rp.*, pp.department, pp.lab_name, pp.research_areas, pp.lab_website
     FROM research_positions rp
     JOIN pi_profiles pp ON pp.id = rp.pi_id
     WHERE rp.id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Position not found' });
  }
  return res.json(rowToPosition(row));
}));

// PUT /api/positions/:id - update (owner only)
router.put('/:id', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, requiredSkills, minGpa, isFunded, compensationType, isOpen, status, deadline, timeCommitment, qualifications, applicationQuestions } = req.body;
  const piResult = await pool.query('SELECT id FROM pi_profiles WHERE user_id = $1', [req.userId]);
  const pi = piResult.rows[0];
  if (!pi) {
    return res.status(404).json({ error: 'PI profile not found' });
  }

  let resolvedStatus: string | null = null;
  if (status !== undefined) {
    resolvedStatus = status;
  } else if (isOpen !== undefined) {
    resolvedStatus = isOpen ? 'open' : 'closed';
  }

  let resolvedCompType: string | null = null;
  if (compensationType !== undefined) {
    resolvedCompType = compensationType;
  } else if (isFunded !== undefined) {
    resolvedCompType = isFunded ? 'paid' : 'unpaid';
  }

  const aqParam =
    applicationQuestions !== undefined
      ? JSON.stringify(Array.isArray(applicationQuestions) ? applicationQuestions : [])
      : null;

  const result = await pool.query(
    `UPDATE research_positions SET
       title             = COALESCE($1, title),
       description       = COALESCE($2, description),
       required_skills   = COALESCE($3, required_skills),
       min_gpa           = COALESCE($4, min_gpa),
       compensation_type = COALESCE($5::compensation_type, compensation_type),
       status            = COALESCE($6::position_status, status),
       deadline          = COALESCE($7, deadline),
       time_commitment   = COALESCE($8, time_commitment),
       qualifications    = COALESCE($9, qualifications),
       application_questions = COALESCE($10::jsonb, application_questions)
     WHERE id = $11 AND pi_id = $12
     RETURNING *`,
    [
      title ?? null,
      description ?? null,
      requiredSkills ?? null,
      minGpa ?? null,
      resolvedCompType,
      resolvedStatus,
      deadline ?? null,
      timeCommitment ?? null,
      qualifications ?? null,
      aqParam,
      id,
      pi.id,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Position not found or access denied' });
  }
  return res.json(rowToPosition(row));
}));

// DELETE /api/positions/:id - close (owner only)
router.delete('/:id', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const piResult = await pool.query('SELECT id FROM pi_profiles WHERE user_id = $1', [req.userId]);
  const pi = piResult.rows[0];
  if (!pi) {
    return res.status(404).json({ error: 'PI profile not found' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE research_positions SET status = 'closed' WHERE id = $1 AND pi_id = $2 RETURNING id`,
      [id, pi.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Position not found or access denied' });
    }
    await client.query(
      `UPDATE applications SET status = 'withdrawn'
       WHERE position_id = $1 AND status IN ('pending', 'reviewing')`,
      [id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return res.status(204).send();
}));

export default router;
