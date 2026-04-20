import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

// POST /api/messages - send a message (creates conversation if needed)
router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { recipientId, body } = req.body;
  if (!recipientId || !body) {
    return res.status(400).json({ error: 'recipientId and body are required' });
  }
  if (!body.trim()) {
    return res.status(400).json({ error: 'Message body cannot be empty' });
  }

  // Use a transaction + advisory lock to prevent duplicate conversations from
  // race conditions when the button is clicked multiple times simultaneously.
  const client = await pool.connect();
  let row;
  try {
    await client.query('BEGIN');

    // Advisory lock: deterministic key derived from sorted user IDs prevents
    // two concurrent requests from creating a duplicate conversation.
    const lockKey = [req.userId, recipientId].sort().join(':');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [lockKey]);

    // Find existing 1-to-1 conversation between these two users using EXISTS
    // (the previous HAVING COUNT(*) = 2 was wrong — the double-join produces
    // exactly 1 row per matching conversation, so that clause never fired)
    const existingConv = await client.query(
      `SELECT c.id FROM conversations c
       WHERE EXISTS (
         SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1
       ) AND EXISTS (
         SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $2
       )
       LIMIT 1`,
      [req.userId, recipientId]
    );

    let conversationId;
    if (existingConv.rows.length > 0) {
      conversationId = existingConv.rows[0].id;
    } else {
      const newConv = await client.query(
        'INSERT INTO conversations DEFAULT VALUES RETURNING id'
      );
      conversationId = newConv.rows[0].id;

      await client.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [conversationId, req.userId, recipientId]
      );
    }

    // Unhide the conversation for all participants so it reappears in everyone's inbox
    await client.query(
      'UPDATE conversation_participants SET hidden = false WHERE conversation_id = $1',
      [conversationId]
    );

    const messageResult = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, req.userId, body.trim()]
    );
    row = messageResult.rows[0];

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return res.status(201).json({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  });
}));

// POST /api/messages/conversations - find or create an empty conversation (no message sent)
router.post('/conversations', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { recipientId } = req.body;
  if (!recipientId) {
    return res.status(400).json({ error: 'recipientId is required' });
  }

  const client = await pool.connect();
  let conversationId: string;
  try {
    await client.query('BEGIN');

    const lockKey = [req.userId, recipientId].sort().join(':');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [lockKey]);

    const existingConv = await client.query(
      `SELECT c.id FROM conversations c
       WHERE EXISTS (
         SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1
       ) AND EXISTS (
         SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $2
       )
       LIMIT 1`,
      [req.userId, recipientId]
    );

    if (existingConv.rows.length > 0) {
      conversationId = existingConv.rows[0].id as string;
    } else {
      const newConv = await client.query(
        'INSERT INTO conversations DEFAULT VALUES RETURNING id'
      );
      conversationId = newConv.rows[0].id as string;

      await client.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [conversationId, req.userId, recipientId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return res.status(200).json({ conversationId });
}));

// GET /api/messages/conversations - list all conversations for current user
router.get('/conversations', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT c.*,
            (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL) as unread_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     WHERE cp.user_id = $1 AND cp.hidden = false
     ORDER BY last_message_at DESC NULLS LAST`,
    [req.userId]
  );

  // Get other participant info for each conversation
  const conversations = await Promise.all(result.rows.map(async (conv) => {
    const participants = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1 AND cp.user_id != $2`,
      [conv.id, req.userId]
    );
    return {
      id: conv.id,
      lastMessage: conv.last_message,
      lastMessageAt: conv.last_message_at,
      unreadCount: parseInt(conv.unread_count, 10),
      otherParticipant: participants.rows[0] || null,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    };
  }));

  return res.json(conversations);
}));

// GET /api/messages/conversations/:id - get messages in a conversation
router.get('/conversations/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verify user is participant
  const participant = await pool.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [id, req.userId]
  );
  if (participant.rows.length === 0) {
    return res.status(403).json({ error: 'Not a participant of this conversation' });
  }

  const result = await pool.query(
    `SELECT m.*, u.first_name, u.last_name, u.role as sender_role
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at ASC`,
    [id]
  );

  return res.json(
    result.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      body: row.body,
      readAt: row.read_at,
      createdAt: row.created_at,
      senderFirstName: row.first_name,
      senderLastName: row.last_name,
      senderRole: row.sender_role,
    }))
  );
}));

// DELETE /api/messages/conversations/:id - hide a conversation from the current user's inbox
// Sets hidden = true on the participant row rather than deleting it, so the other
// participant's row is unaffected and they can still send and receive messages normally.
router.delete('/conversations/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verify the user is actually a participant (hidden or not)
  const check = await pool.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [id, req.userId]
  );
  if (check.rows.length === 0) {
    return res.status(403).json({ error: 'Not a participant of this conversation' });
  }

  // Soft-hide: keep the row so the other participant can still message this user
  await pool.query(
    'UPDATE conversation_participants SET hidden = true WHERE conversation_id = $1 AND user_id = $2',
    [id, req.userId]
  );

  return res.status(204).send();
}));

// PATCH /api/messages/:id/read - mark a message as read
router.patch('/:id/read', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verify user is participant of the conversation
  const message = await pool.query(
    `SELECT m.id, m.conversation_id, m.sender_id
     FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
     WHERE m.id = $1 AND cp.user_id = $2`,
    [id, req.userId]
  );

  if (message.rows.length === 0) {
    return res.status(404).json({ error: 'Message not found or access denied' });
  }

  const result = await pool.query(
    `UPDATE messages SET read_at = NOW()
     WHERE id = $1 AND read_at IS NULL
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    // Already read or not found
    const existing = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);
    return res.json({
      id: existing.rows[0].id,
      conversationId: existing.rows[0].conversation_id,
      senderId: existing.rows[0].sender_id,
      body: existing.rows[0].body,
      readAt: existing.rows[0].read_at,
      createdAt: existing.rows[0].created_at,
    });
  }

  const row = result.rows[0];
  return res.json({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  });
}));

export default router;