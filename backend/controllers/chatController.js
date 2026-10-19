import pool from '../config/db.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// @desc    Get chat messages with a specific friend
// @route   GET /api/chat/:friendId
// @access  Private
export const getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    // Verify friendship status first (only friends can chat)
    const [friendship] = await pool.query(
      'SELECT id FROM friend_requests WHERE status = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))',
      ['accepted', userId, friendId, friendId, userId]
    );

    if (friendship.length === 0) {
      return res.status(403).json({ message: 'You can only view chat logs with accepted friends' });
    }

    // Get messages with reply info and reactions
    const [messages] = await pool.query(
      `SELECT m.*, u.username as sender_username, u.profile_pic as sender_pic,
       rm.id as reply_msg_id, rm.message as reply_message, rm.sender_id as reply_sender_id,
       ru.username as reply_sender_username
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.sender_id = ru.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC
       LIMIT 500`,
      [userId, friendId, friendId, userId]
    );

    // Get reactions for these messages
    const messageIds = messages.map(m => m.id);
    let reactionsMap = {};
    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(',');
      const [reactions] = await pool.query(
        `SELECT mr.*, u.username FROM message_reactions mr
         JOIN users u ON mr.user_id = u.id
         WHERE mr.message_id IN (${placeholders})`,
        messageIds
      );
      reactions.forEach(r => {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
        reactionsMap[r.message_id].push(r);
      });
    }

    // Attach reactions to messages
    const enrichedMessages = messages.map(msg => ({
      ...msg,
      reactions: reactionsMap[msg.id] || [],
      reply: msg.reply_msg_id ? {
        id: msg.reply_msg_id,
        message: msg.reply_message,
        sender_id: msg.reply_sender_id,
        sender_username: msg.reply_sender_username
      } : null
    }));

    // Mark messages received from this friend as read
    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [friendId, userId]
    );

    res.json(enrichedMessages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Send a new chat message (with optional attachment)
// @route   POST /api/chat/:friendId
// @access  Private
export const sendChatMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const friendId = req.params.friendId;
    const { message, reply_to_id } = req.body;

    // Allow either message text or attachment
    const hasMessage = message && message.trim();
    const hasFile = !!req.file;

    if (!hasMessage && !hasFile) {
      return res.status(400).json({ message: 'Message content or attachment is required' });
    }

    // Verify friendship status first
    const [friendship] = await pool.query(
      'SELECT id FROM friend_requests WHERE status = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))',
      ['accepted', senderId, friendId, friendId, senderId]
    );

    if (friendship.length === 0) {
      return res.status(403).json({ message: 'You can only send messages to accepted friends' });
    }

    let attachmentUrl = null;
    let attachmentType = null;
    let attachmentName = null;
    let attachmentSize = null;

    if (hasFile) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'File type not allowed. Supported: images, videos, PDFs, documents' });
      }

      if (req.file.size > 25 * 1024 * 1024) {
        return res.status(400).json({ message: 'File size must be under 25MB' });
      }

      const uploadResult = await uploadOnCloudinary(req.file.path);
      if (uploadResult) {
        attachmentUrl = uploadResult.secure_url;
        attachmentName = req.file.originalname;
        attachmentSize = req.file.size;

        if (req.file.mimetype.startsWith('image/')) {
          attachmentType = 'image';
        } else if (req.file.mimetype.startsWith('video/')) {
          attachmentType = 'video';
        } else {
          attachmentType = 'document';
        }
      } else {
        return res.status(500).json({ message: 'Failed to upload attachment' });
      }
    }

    // Validate reply_to_id if provided
    let validReplyId = null;
    if (reply_to_id) {
      const [replyMsg] = await pool.query(
        'SELECT id FROM messages WHERE id = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))',
        [reply_to_id, senderId, friendId, friendId, senderId]
      );
      if (replyMsg.length > 0) {
        validReplyId = reply_to_id;
      }
    }

    const [result] = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, reply_to_id, attachment_url, attachment_type, attachment_name, attachment_size) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [senderId, friendId, hasMessage ? message.trim() : '', validReplyId, attachmentUrl, attachmentType, attachmentName, attachmentSize]
    );

    const [newMsg] = await pool.query(
      `SELECT m.*, u.username as sender_username, u.profile_pic as sender_pic,
       rm.id as reply_msg_id, rm.message as reply_message, rm.sender_id as reply_sender_id,
       ru.username as reply_sender_username
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.sender_id = ru.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const enrichedMsg = {
      ...newMsg[0],
      reactions: [],
      reply: newMsg[0].reply_msg_id ? {
        id: newMsg[0].reply_msg_id,
        message: newMsg[0].reply_message,
        sender_id: newMsg[0].reply_sender_id,
        sender_username: newMsg[0].reply_sender_username
      } : null
    };

    // Create notification for recipient
    try {
      const [recipientSettings] = await pool.query('SELECT notifications_enabled FROM users WHERE id = ?', [friendId]);
      if (recipientSettings.length > 0 && recipientSettings[0].notifications_enabled) {
        const msgPreview = hasMessage ? message.trim().substring(0, 50) : `sent an attachment`;
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, type, message) VALUES (?, ?, ?, ?)',
          [friendId, senderId, 'message', msgPreview]
        );
      }
    } catch (notifErr) {
      console.error('Failed to create message notification:', notifErr.message);
    }

    res.status(201).json(enrichedMsg);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Edit a message
// @route   PUT /api/chat/message/:messageId
// @access  Private
export const editMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM messages WHERE id = ? AND sender_id = ?',
      [messageId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    await pool.query(
      'UPDATE messages SET message = ?, is_edited = 1 WHERE id = ?',
      [message.trim(), messageId]
    );

    const [updated] = await pool.query(
      `SELECT m.*, u.username as sender_username, u.profile_pic as sender_pic
       FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`,
      [messageId]
    );

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chat/message/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM messages WHERE id = ? AND sender_id = ?',
      [messageId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    await pool.query('DELETE FROM messages WHERE id = ?', [messageId]);
    res.json({ message: 'Message deleted', id: parseInt(messageId) });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Add reaction to a message
// @route   POST /api/chat/message/:messageId/react
// @access  Private
export const addReaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    // Verify message exists and user has access
    const [msg] = await pool.query('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (msg.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // User must be sender or receiver
    if (msg[0].sender_id !== userId && msg[0].receiver_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Toggle reaction (add or remove)
    const [existing] = await pool.query(
      'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [messageId, userId, emoji]
    );

    if (existing.length > 0) {
      await pool.query('DELETE FROM message_reactions WHERE id = ?', [existing[0].id]);
      res.json({ action: 'removed', emoji });
    } else {
      await pool.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
        [messageId, userId, emoji]
      );
      res.json({ action: 'added', emoji });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get total unread messages count and grouped by sender
// @route   GET /api/chat/unread/count
// @access  Private
export const getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total unread count
    const [totalRes] = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [userId]
    );

    // Grouped by sender
    const [groupedRes] = await pool.query(
      'SELECT sender_id, COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0 GROUP BY sender_id',
      [userId]
    );

    const bySender = {};
    groupedRes.forEach(row => {
      bySender[row.sender_id] = row.count;
    });

    res.json({
      success: true,
      total: totalRes[0].count,
      bySender
    });
  } catch (error) {
    console.error("getUnreadMessagesCount ERROR:", error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get conversation list with last message preview
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all friends with their last message
    const [friends] = await pool.query(
      `SELECT u.id, u.username, u.profile_pic, u.email,
       (SELECT m.message FROM messages m 
        WHERE ((m.sender_id = u.id AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = u.id))
        ORDER BY m.created_at DESC LIMIT 1) as last_message,
       (SELECT m.created_at FROM messages m 
        WHERE ((m.sender_id = u.id AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = u.id))
        ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
       (SELECT m.attachment_type FROM messages m 
        WHERE ((m.sender_id = u.id AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = u.id))
        ORDER BY m.created_at DESC LIMIT 1) as last_attachment_type,
       (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
       FROM users u
       WHERE u.id IN (
         SELECT receiver_id FROM friend_requests WHERE sender_id = ? AND status = 'accepted'
         UNION
         SELECT sender_id FROM friend_requests WHERE receiver_id = ? AND status = 'accepted'
       )
       ORDER BY last_message_time DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );

    res.json(friends);
  } catch (error) {
    console.error("getConversations ERROR:", error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
