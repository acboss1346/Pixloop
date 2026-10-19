import pool from '../config/db.js';

// @desc    Like a post
// @route   POST /api/posts/:id/like
// @access  Private
export const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existingLike] = await pool.query(
      'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingLike.length > 0) {
      return res.status(400).json({ message: 'Post already liked' });
    }

    await pool.query(
      'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );

    const [post] = await pool.query('SELECT p.user_id, u.notifications_enabled FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [postId]);
    // Prevent notifications for user's own actions
    if (post.length > 0 && post[0].user_id !== userId && post[0].notifications_enabled) {
      const recipientId = post[0].user_id;

      // Prevent duplicate unread like notifications
      const [existingLikeNotif] = await pool.query(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND sender_id = ? AND post_id = ? AND type = 'like' AND (is_read = 0 OR is_read IS NULL) 
         LIMIT 1`,
        [recipientId, userId, postId]
      );

      if (existingLikeNotif.length > 0) {
        await pool.query(
          'UPDATE notifications SET created_at = CURRENT_TIMESTAMP WHERE id = ?',
          [existingLikeNotif[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, post_id, type, message, is_read) VALUES (?, ?, ?, ?, ?, 0)',
          [recipientId, userId, postId, 'like', 'liked your post.']
        );
      }
    }

    res.json({ success: true, message: 'Post liked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Unlike a post
// @route   DELETE /api/posts/:id/like
// @access  Private
export const unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existingLike] = await pool.query(
      'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingLike.length === 0) {
      return res.status(400).json({ success: false, message: 'Post has not yet been liked' });
    }

    await pool.query(
      'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    res.json({ success: true, message: 'Post unliked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Add a comment
// @route   POST /api/posts/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const trimmedComment = comment.trim();

    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, userId, trimmedComment]
    );

    const [post] = await pool.query('SELECT p.user_id, u.notifications_enabled FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [postId]);
    // Prevent notifications for user's own actions
    if (post.length > 0 && post[0].user_id !== userId && post[0].notifications_enabled) {
      const recipientId = post[0].user_id;
      const snippet = trimmedComment.length > 50 ? trimmedComment.slice(0, 47) + '...' : trimmedComment;
      const notifMessage = `commented: "${snippet}"`;

      // Check if an unread notification from this sender on this post already exists
      const [existingNotif] = await pool.query(
        `SELECT id FROM notifications 
         WHERE user_id = ? AND sender_id = ? AND post_id = ? AND type = 'comment' AND (is_read = 0 OR is_read IS NULL)
         ORDER BY created_at DESC LIMIT 1`,
        [recipientId, userId, postId]
      );

      if (existingNotif.length > 0) {
        await pool.query(
          'UPDATE notifications SET message = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
          [notifMessage, existingNotif[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, post_id, type, message, is_read) VALUES (?, ?, ?, ?, ?, 0)',
          [recipientId, userId, postId, 'comment', notifMessage]
        );
      }
    }

    const [newComment] = await pool.query(
      `SELECT c.*, u.username, u.profile_pic 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newComment[0]);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Private
export const getComments = async (req, res) => {
  try {
    const postId = req.params.id;

    const [comments] = await pool.query(
      `SELECT c.*, u.username, u.profile_pic 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Save a post
// @route   POST /api/posts/:id/save
// @access  Private
export const savePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existingSave] = await pool.query(
      'SELECT * FROM saves WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingSave.length > 0) {
      return res.status(400).json({ message: 'Post already saved' });
    }

    await pool.query(
      'INSERT INTO saves (post_id, user_id) VALUES (?, ?)',
      [postId, userId]
    );

    res.json({ message: 'Post saved' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Unsave a post
// @route   DELETE /api/posts/:id/save
// @access  Private
export const unsavePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existingSave] = await pool.query(
      'SELECT * FROM saves WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    if (existingSave.length === 0) {
      return res.status(400).json({ message: 'Post has not yet been saved' });
    }

    await pool.query(
      'DELETE FROM saves WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    res.json({ message: 'Post unsaved' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
