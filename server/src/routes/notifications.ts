import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { config } from '../config/env.js';
import {
  dryRunMatchForPosition,
  queueNotificationsForPosition,
  processNotificationQueue,
} from '../lib/notificationQueue.js';
import {
  fetchNotificationPreferencesForUser,
  updateNotificationPreferencesForUser,
} from '../lib/studentNotificationPreferences.js';

const router = Router();

// GET /api/notifications/preferences — fetch notification prefs (student only)
router.get(
  '/preferences',
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

// PUT /api/notifications/preferences — update notification prefs (student only)
router.put(
  '/preferences',
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

// GET /api/notifications/unsubscribe?studentId=xxx — one-click unsubscribe (no auth)
router.get(
  '/unsubscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.query;
    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).send('Missing studentId parameter.');
    }
    const result = await pool.query(
      `UPDATE student_profiles SET notify_new_positions = false, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [studentId]
    );
    if (result.rowCount === 0) {
      return res.status(404).send('Profile not found.');
    }
    const clientUrl = config.clientUrl.replace(/\/$/, '');
    // Redirect to settings page with a success flash param, or show plain page
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>Unsubscribed — ResearchHub</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
                 min-height: 100vh; margin: 0; background: #f8fafc; }
          .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
                  padding: 40px 48px; text-align: center; max-width: 420px; }
          h1 { color: #001A3E; margin-top: 0; }
          p { color: #555; line-height: 1.6; }
          a { color: #0d9488; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>You've been unsubscribed</h1>
          <p>You will no longer receive new-position alert emails from ResearchHub.</p>
          <p>You can re-enable alerts anytime in your <a href="${clientUrl}/student/settings">Settings</a>.</p>
        </div>
      </body>
      </html>
    `);
  })
);

// ---------------------------------------------------------------------------
// Dev-only endpoints (blocked in production)
// ---------------------------------------------------------------------------

function devOnly(req: Request, res: Response, next: () => void) {
  if (config.nodeEnv === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
}

/**
 * GET /api/notifications/dev/dry-run/:positionId
 *
 * Shows which opted-in students would be matched for a given position and why.
 * Does NOT write to DB or send any email.
 *
 * Response:
 *   { position: { id, title, department, required_skills, research_areas },
 *     matches: [{ studentId, email, firstName, skills, interests,
 *                 notificationKeywords, notificationDepartments, reason }] }
 */
router.get(
  '/dev/dry-run/:positionId',
  (req, res, next) => devOnly(req, res, next),
  asyncHandler(async (req: Request, res: Response) => {
    const { positionId } = req.params;
    const { position, matches } = await dryRunMatchForPosition(positionId);

    if (!position) {
      return res.status(404).json({ error: 'Position not found or not open' });
    }

    // Enrich matches with student details for readability
    const enriched = await Promise.all(
      matches.map(async ({ studentId, reason }) => {
        const r = await pool.query(
          `SELECT u.email, u.first_name, sp.skills, sp.interests,
                  sp.notification_keywords, sp.notification_departments
           FROM student_profiles sp
           JOIN users u ON u.id = sp.user_id
           WHERE sp.id = $1`,
          [studentId]
        );
        const row = r.rows[0];
        return {
          studentId,
          email: row?.email,
          firstName: row?.first_name,
          skills: row?.skills ?? [],
          interests: row?.interests ?? [],
          notificationKeywords: row?.notification_keywords ?? [],
          notificationDepartments: row?.notification_departments ?? [],
          reason,
        };
      })
    );

    return res.json({ position, matches: enriched });
  })
);

/**
 * POST /api/notifications/dev/trigger/:positionId
 *
 * Full end-to-end trigger for a position:
 *   1. Resets notification_last_sent_at for all students (bypasses rate limit)
 *   2. Queues matching students for the position
 *   3. Processes the queue (sends / logs emails)
 *
 * Query param: ?dryRun=true  → skips steps 2-3 and just returns match preview
 */
router.post(
  '/dev/trigger/:positionId',
  (req, res, next) => devOnly(req, res, next),
  asyncHandler(async (req: Request, res: Response) => {
    const { positionId } = req.params;
    const isDryRun = req.query.dryRun === 'true';

    const { position, matches } = await dryRunMatchForPosition(positionId);
    if (!position) {
      return res.status(404).json({ error: 'Position not found or not open' });
    }

    if (isDryRun) {
      return res.json({ dryRun: true, position, matchCount: matches.length, matches });
    }

    // Reset rate limits so we can re-trigger immediately
    await pool.query(`UPDATE student_profiles SET notification_last_sent_at = NULL`);

    // Clear any existing unsent queue entries for this position so we can re-queue
    await pool.query(
      `DELETE FROM notification_queue WHERE position_id = $1 AND sent_at IS NULL`,
      [positionId]
    );

    await queueNotificationsForPosition(positionId);
    await processNotificationQueue(true /* bypassRateLimit */);

    return res.json({
      dryRun: false,
      position,
      matchCount: matches.length,
      message: `Triggered for ${matches.length} student(s). Check server console for email output.`,
    });
  })
);

export default router;
