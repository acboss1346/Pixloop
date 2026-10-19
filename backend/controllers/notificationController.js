import pool from '../config/db.js';

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    const [notifications] = await pool.query(
      `SELECT n.*, u.username as sender_username, u.profile_pic as sender_pic, p.image_url as post_image
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       LEFT JOIN posts p ON n.post_id = p.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Get unread count
    const [unreadRes] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)',
      [userId]
    );

    res.json({
      success: true,
      notifications,
      unreadCount: unreadRes[0].count,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)',
      [userId]
    );

    res.json({ 
      success: true, 
      message: 'All notifications marked as read',
      updatedCount: result.affectedRows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)',
      [userId]
    );

    res.json({ success: true, count: result[0].count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
