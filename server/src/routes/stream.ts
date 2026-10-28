import { Router } from 'express';
import { StreamChat } from 'stream-chat';
import { config } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import pool from '../db/pool.js';

const router = Router();

const streamClient = StreamChat.getInstance(config.streamApiKey, config.streamApiSecret);

// POST /api/stream/token — returns a Stream Chat user token for the authenticated user
router.post(
  '/token',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query<{ first_name: string; last_name: string }>(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [req.userId]
    );

    const firstName = rows[0]?.first_name ?? '';
    const lastName = rows[0]?.last_name ?? '';

    // Stream Chat only accepts built-in roles: 'admin' | 'user' | 'moderator' | 'guest' | 'anonymous'.
    // Map our app roles to the closest Stream built-in, and preserve the real app role
    // in the custom `appRole` field so the frontend can read it back.
    const streamRole =
      req.role === 'admin' ? 'admin' :
      req.role === 'pi'    ? 'moderator' :
                             'user'; // student → 'user'

    await streamClient.upsertUser({
      id: req.userId!,
      name: `${firstName} ${lastName}`.trim(),
      role: streamRole,
      appRole: req.role, // custom field — preserves 'student' | 'pi' | 'admin'
    });

    const token = streamClient.createToken(req.userId!);
    res.json({ token });
  })
);

// POST /api/stream/upsert-user — ensures another user exists in Stream before a PI
// creates a channel with them. The PI is already upserted by /token; this covers
// the student side so Stream doesn't reject the channel.create() call.
router.post(
  '/upsert-user',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    const { rows } = await pool.query<{
      first_name: string;
      last_name: string;
      role: string;
    }>(
      'SELECT first_name, last_name, role FROM users WHERE id = $1',
      [userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { first_name, last_name, role } = rows[0];

    const streamRole =
      role === 'admin' ? 'admin' :
      role === 'pi'    ? 'moderator' :
                         'user'; // student → 'user'

    await streamClient.upsertUser({
      id: userId,
      name: `${first_name} ${last_name}`.trim(),
      role: streamRole,
      appRole: role, // custom field — preserves 'student' | 'pi' | 'admin'
    });

    return res.json({ success: true });
  })
);

export default router;
