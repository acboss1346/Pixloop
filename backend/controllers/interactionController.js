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
    if (post.length > 0 && post[0].user_id !== userId && post[0].notifications_enabled) {
      await pool.query(
        'INSERT INTO notifications (user_id, sender_id, post_id, type) VALUES (?, ?, ?, ?)',
        [post[0].user_id, userId, postId, 'like']
      );
    }

    res.json({ message: 'Post liked' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
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
      return res.status(400).json({ message: 'Post has not yet been liked' });
    }

    await pool.query(
      'DELETE FROM likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    res.json({ message: 'Post unliked' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
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

    if (!comment) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, userId, comment]
    );

    const [post] = await pool.query('SELECT p.user_id, u.notifications_enabled FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [postId]);
    if (post.length > 0 && post[0].user_id !== userId && post[0].notifications_enabled) {
      await pool.query(
        'INSERT INTO notifications (user_id, sender_id, post_id, type) VALUES (?, ?, ?, ?)',
        [post[0].user_id, userId, postId, 'comment']
      );
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
    res.status(500).json({ message: 'Server Error', error: error.message });
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
