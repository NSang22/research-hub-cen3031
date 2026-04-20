import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import pool from '../db/pool.js';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { parseProfileLinks, validateProfileLinks } from '../lib/profileLinks.js';
import {
  fetchNotificationPreferencesForUser,
  updateNotificationPreferencesForUser,
} from '../lib/studentNotificationPreferences.js';

const router = Router();

/** Supabase Storage bucket id (must match dashboard bucket name) */
const RESUMES_STORAGE_BUCKET = 'Resumes';

/** Path inside the resumes bucket from a Supabase public object URL, or null */
function resumeObjectPathFromPublicUrl(resumeUrl: string): string | null {
  try {
    const url = new URL(resumeUrl);
    const marker = `/object/public/${RESUMES_STORAGE_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// GET /api/students/profile - own profile (student only)
router.get('/profile', authMiddleware, requireRole('student'), asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT sp.*, u.first_name, u.last_name, u.email
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.user_id = $1`,
    [req.userId]
  );
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  return res.json({
    id: row.id,
    userId: row.user_id,
    major: row.major,
    gpa: row.gpa ? parseFloat(row.gpa) : null,
    graduationYear: row.graduation_year,
    skills: row.skills || [],
    bio: row.bio,
    resumeUrl: row.resume_url,
    yearLevel: row.academic_level,
    interests: row.interests || [],
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
  });
}));

// PUT /api/students/profile - update own profile
router.put('/profile', authMiddleware, requireRole('student'), asyncHandler(async (req: Request, res: Response) => {
  const { major, gpa, graduationYear, skills, bio, resumeUrl, yearLevel, interests, profileLinks } = req.body;
  
  if (profileLinks !== undefined) {
    const errMsg = validateProfileLinks(profileLinks);
    if (errMsg) {
      return res.status(400).json({ error: errMsg });
    }
  }

  const linksJson = profileLinks !== undefined ? JSON.stringify(parseProfileLinks(profileLinks)) : null;

  const result = await pool.query(
    `UPDATE student_profiles SET
       major           = COALESCE($1, major),
       gpa             = COALESCE($2, gpa),
       graduation_year = COALESCE($3, graduation_year),
       skills          = COALESCE($4, skills),
       bio             = COALESCE($5, bio),
       resume_url      = COALESCE($6, resume_url),
       academic_level  = COALESCE($7, academic_level),
       interests       = COALESCE($8, interests),
       profile_links   = COALESCE($9::jsonb, profile_links),
       updated_at      = NOW()
     WHERE user_id = $10
     RETURNING *`,
    [
      major ?? null,
      gpa ?? null,
      graduationYear ?? null,
      skills ?? null,
      bio ?? null,
      resumeUrl ?? null,
      yearLevel ?? null,
      interests ?? null,
      linksJson,
      req.userId,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  return res.json({
    id: row.id,
    userId: row.user_id,
    major: row.major,
    gpa: row.gpa ? parseFloat(row.gpa) : null,
    graduationYear: row.graduation_year,
    skills: row.skills || [],
    bio: row.bio,
    resumeUrl: row.resume_url,
    yearLevel: row.academic_level,
    interests: row.interests || [],
    profileLinks: parseProfileLinks(row.profile_links),
  });
}));

// GET /api/students/notification-preferences — research opportunity email prefs (student only)
router.get(
  '/notification-preferences',
  authMiddleware,
  requireRole('student'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const data = await fetchNotificationPreferencesForUser(userId);
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    return res.json(data);
  })
);

// PUT /api/students/notification-preferences
router.put(
  '/notification-preferences',
  authMiddleware,
  requireRole('student'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await updateNotificationPreferencesForUser(userId, req.body);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json(result.data);
  })
);

// GET /api/students - list with filters (PI only)
router.get('/', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const { major, minGpa, skills, yearLevel } = req.query;
  let query = `
    SELECT sp.*, u.first_name, u.last_name, u.email
    FROM student_profiles sp
    JOIN users u ON u.id = sp.user_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (major && typeof major === 'string') {
    query += ` AND sp.major ILIKE $${paramIndex}`;
    params.push(`%${major}%`);
    paramIndex++;
  }
  if (minGpa !== undefined && minGpa !== '') {
    query += ` AND sp.gpa >= $${paramIndex}`;
    params.push(parseFloat(minGpa as string));
    paramIndex++;
  }
  if (skills && typeof skills === 'string') {
    const skillArr = skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillArr.length > 0) {
      query += ` AND sp.skills && $${paramIndex}::text[]`;
      params.push(skillArr);
      paramIndex++;
    }
  }
  if (yearLevel && typeof yearLevel === 'string') {
    query += ` AND sp.academic_level = $${paramIndex}`;
    params.push(yearLevel);
    paramIndex++;
  }

  query += ' ORDER BY sp.updated_at DESC';

  const result = await pool.query(query, params);
  return res.json(
    result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      major: row.major,
      gpa: row.gpa ? parseFloat(row.gpa) : null,
      graduationYear: row.graduation_year,
      skills: row.skills || [],
      bio: row.bio,
      resumeUrl: row.resume_url,
      yearLevel: row.academic_level,
      interests: row.interests || [],
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      profileLinks: parseProfileLinks(row.profile_links),
    }))
  );
}));

// GET /api/students/:id - single student (PI only)
router.get('/:id', authMiddleware, requireRole('pi'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT sp.*, u.first_name, u.last_name, u.email
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Student not found' });
  }
  return res.json({
    id: row.id,
    userId: row.user_id,
    major: row.major,
    gpa: row.gpa ? parseFloat(row.gpa) : null,
    graduationYear: row.graduation_year,
    skills: row.skills || [],
    bio: row.bio,
    resumeUrl: row.resume_url,
    yearLevel: row.academic_level,
    interests: row.interests || [],
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    profileLinks: parseProfileLinks(row.profile_links),
  });
}));

// POST /api/students/resume - upload resume (student only)
router.post('/resume', authMiddleware, requireRole('student'), upload.single('resume'), asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large (max 5MB)' });
  }
  if (file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }

  const studentResult = await pool.query('SELECT id FROM student_profiles WHERE user_id = $1', [req.userId]);
  const student = studentResult.rows[0];
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found' });
  }

  // Get current resume URL to delete old file if exists
  const current = await pool.query('SELECT resume_url FROM student_profiles WHERE user_id = $1', [req.userId]);
  const oldUrl = current.rows[0]?.resume_url;

  const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
  const safeName = `resume_${student.id}${ext}`;
  const filePath = `${student.id}/${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(RESUMES_STORAGE_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    return res.status(500).json({ error: 'Upload failed: ' + uploadError.message });
  }

  const { data: urlData } = supabaseAdmin.storage.from(RESUMES_STORAGE_BUCKET).getPublicUrl(filePath);
  const resumeUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await pool.query('UPDATE student_profiles SET resume_url = $1, updated_at = NOW() WHERE user_id = $2', [resumeUrl, req.userId]);

  return res.json({ resumeUrl, filename: file.originalname });
}));

// DELETE /api/students/resume - remove resume (student only)
router.delete('/resume', authMiddleware, requireRole('student'), asyncHandler(async (req: Request, res: Response) => {
  const current = await pool.query('SELECT id, resume_url FROM student_profiles WHERE user_id = $1', [req.userId]);
  const row = current.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Student profile not found' });
  }
  if (row.resume_url) {
    const objectPath = resumeObjectPathFromPublicUrl(row.resume_url);
    if (objectPath) {
      await supabaseAdmin.storage.from(RESUMES_STORAGE_BUCKET).remove([objectPath]);
    }
  }
  await pool.query('UPDATE student_profiles SET resume_url = NULL, updated_at = NOW() WHERE user_id = $1', [req.userId]);
  return res.status(204).send();
}));

// GET /api/students/:id/resume - get resume URL (PI or owner)
router.get('/:id/resume', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query('SELECT id, user_id, resume_url, first_name FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.id = $1', [id]);
  const row = result.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Student not found' });
  }
  if (!row.resume_url) {
    return res.status(404).json({ error: 'No resume uploaded' });
  }
  const filename = `${row.first_name?.toLowerCase().replace(/\s+/g, '_') || 'student'}_resume.pdf`;
  return res.json({ resumeUrl: row.resume_url, filename });
}));

export default router;
