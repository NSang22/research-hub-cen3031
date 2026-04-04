import { Router } from 'express';
import pool from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
const router = Router();
// GET /api/pis/profile - own profile
router.get('/profile', authMiddleware, requireRole('pi'), asyncHandler(async (req, res) => {
    const result = await pool.query(`SELECT pp.*, u.first_name, u.last_name, u.email
     FROM pi_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.user_id = $1`, [req.userId]);
    const row = result.rows[0];
    if (!row) {
        return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        department: row.department,
        labName: row.lab_name,
        researchArea: (row.research_areas || []).join(', ') || null,
        researchAreas: row.research_areas || [],
        labWebsite: row.lab_website,
        staffingNeeds: row.staffing_needs,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
    });
}));
// PUT /api/pis/profile - update own profile
router.put('/profile', authMiddleware, requireRole('pi'), asyncHandler(async (req, res) => {
    const { name, department, labName, researchArea, researchAreas, labWebsite, staffingNeeds } = req.body;
    // Accept either researchAreas (array) or researchArea (string)
    let areas = null;
    if (researchAreas !== undefined) {
        areas = Array.isArray(researchAreas) ? researchAreas : [researchAreas];
    }
    else if (researchArea !== undefined) {
        areas = researchArea
            ? researchArea.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
    }
    const result = await pool.query(`UPDATE pi_profiles SET
       name            = COALESCE($1, name),
       department      = COALESCE($2, department),
       lab_name        = COALESCE($3, lab_name),
       research_areas  = COALESCE($4, research_areas),
       lab_website     = COALESCE($5, lab_website),
       staffing_needs  = COALESCE($6, staffing_needs),
       updated_at      = NOW()
     WHERE user_id = $7
     RETURNING *`, [
        name ?? null,
        department ?? null,
        labName ?? null,
        areas,
        labWebsite ?? null,
        staffingNeeds ?? null,
        req.userId,
    ]);
    const row = result.rows[0];
    if (!row) {
        return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        department: row.department,
        labName: row.lab_name,
        researchArea: (row.research_areas || []).join(', ') || null,
        researchAreas: row.research_areas || [],
        labWebsite: row.lab_website,
        staffingNeeds: row.staffing_needs,
    });
}));
// GET /api/pis/roster - lab roster for the logged-in PI
router.get('/roster', authMiddleware, requireRole('pi'), asyncHandler(async (req, res) => {
    // Get accepted students from this PI's positions (active researchers)
    const acceptedResult = await pool.query(`SELECT
       a.id AS application_id,
       a.status,
       a.applied_at,
       sp.id AS student_id,
       sp.major,
       sp.gpa,
       sp.graduation_year,
       sp.skills,
       sp.bio,
       sp.year_level,
       u.first_name,
       u.last_name,
       u.email,
       p.title AS position_title,
       p.id AS position_id
     FROM applications a
     JOIN student_profiles sp ON sp.id = a.student_id
     JOIN users u ON u.id = sp.user_id
     JOIN positions p ON p.id = a.position_id
     JOIN pi_profiles pp ON pp.id = p.pi_id
     WHERE pp.user_id = $1 AND a.status = 'accepted'
     ORDER BY a.applied_at DESC`, [req.userId]);
    // Also get participant profiles for students in participant program
    // Only show participants who have filled out their participant profile
    const participantResult = await pool.query(`SELECT
       pp_profile.id AS participant_id,
       pp_profile.user_id,
       pp_profile.available_days,
       pp_profile.available_times,
       pp_profile.hours_per_week,
       pp_profile.study_types,
       u.first_name,
       u.last_name,
       u.email,
       sp.major,
       sp.gpa,
       sp.skills,
       sp.bio,
       sp.year_level
     FROM participant_profiles pp_profile
     JOIN users u ON u.id = pp_profile.user_id
     JOIN student_profiles sp ON sp.user_id = pp_profile.user_id
     LIMIT 50`, []);
    return res.json({
        activeResearchers: acceptedResult.rows.map((row) => ({
            applicationId: row.application_id,
            studentId: row.student_id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            major: row.major,
            gpa: row.gpa ? parseFloat(row.gpa) : null,
            graduationYear: row.graduation_year,
            skills: row.skills || [],
            bio: row.bio,
            yearLevel: row.year_level,
            interests: row.interests || [],
            positionTitle: row.position_title,
            positionId: row.position_id,
            joinedAt: row.applied_at,
        })),
        participants: participantResult.rows.map((row) => ({
            participantId: row.participant_id,
            userId: row.user_id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            major: row.major,
            gpa: row.gpa ? parseFloat(row.gpa) : null,
            skills: row.skills || [],
            bio: row.bio,
            yearLevel: row.year_level,
            availableDays: row.available_days || [],
            availableTimes: row.available_times || [],
            hoursPerWeek: row.hours_per_week,
            studyTypes: row.study_types || [],
        })),
    });
}));
export default router;
