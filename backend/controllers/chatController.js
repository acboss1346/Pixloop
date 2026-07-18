import pool from '../config/db.js';

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

    const [messages] = await pool.query(
      `SELECT m.*, u.username as sender_username, u.profile_pic as sender_pic
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userId, friendId, friendId, userId]
    );

    // Mark messages received from this friend as read
    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [friendId, userId]
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Send a new chat message
// @route   POST /api/chat/:friendId
// @access  Private
export const sendChatMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const friendId = req.params.friendId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Verify friendship status first
    const [friendship] = await pool.query(
      'SELECT id FROM friend_requests WHERE status = ? AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))',
      ['accepted', senderId, friendId, friendId, senderId]
    );

    if (friendship.length === 0) {
      return res.status(403).json({ message: 'You can only send messages to accepted friends' });
    }

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [senderId, friendId, message.trim()]
    );

    const [newMsg] = await pool.query(
      `SELECT m.*, u.username as sender_username, u.profile_pic as sender_pic
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newMsg[0]);
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
