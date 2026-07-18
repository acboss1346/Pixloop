import pool from '../config/db.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
    const { caption, community_id } = req.body;
    let imageUrl = '';

    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      if (uploadResult) {
        imageUrl = uploadResult.secure_url;
      } else {
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    } else {
      return res.status(400).json({ message: 'Image is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, image_url, caption, community_id) VALUES (?, ?, ?, ?)',
      [req.user.id, imageUrl, caption || '', community_id || null]
    );

    const [newPost] = await pool.query(
      `SELECT p.*, u.username, u.profile_pic 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newPost[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
export const getPosts = async (req, res) => {
  try {
    const { community_id, user_id, liked_by, saved_by } = req.query;
    
    let query = `SELECT p.*, u.username, u.profile_pic,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
       (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
       (SELECT COUNT(*) FROM saves WHERE post_id = p.id) as save_count,
       (SELECT COUNT(*) > 0 FROM saves WHERE post_id = p.id AND user_id = ?) as is_saved
       FROM posts p 
       JOIN users u ON p.user_id = u.id `;
    
    const queryParams = [req.user.id, req.user.id];
    const whereClauses = [];

    if (community_id) {
      whereClauses.push(`p.community_id = ?`);
      queryParams.push(community_id);
    }

    if (user_id) {
      whereClauses.push(`p.user_id = ?`);
      queryParams.push(user_id);
    }

    if (liked_by) {
      whereClauses.push(`p.id IN (SELECT post_id FROM likes WHERE user_id = ?)`);
      queryParams.push(liked_by);
    }

    if (saved_by) {
      whereClauses.push(`p.id IN (SELECT post_id FROM saves WHERE user_id = ?)`);
      queryParams.push(saved_by);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY p.created_at DESC`;

    const [posts] = await pool.query(query, queryParams);
    // Convert is_liked and is_saved from 0/1 to boolean
    const formattedPosts = posts.map(post => ({
      ...post,
      is_liked: !!post.is_liked,
      is_saved: !!post.is_saved
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('getPosts ERROR:', error.message, error.sql);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Private
export const getPost = async (req, res) => {
  try {
    const [posts] = await pool.query(
      `SELECT p.*, u.username, u.profile_pic,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
       (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
       (SELECT COUNT(*) FROM saves WHERE post_id = p.id) as save_count,
       (SELECT COUNT(*) > 0 FROM saves WHERE post_id = p.id AND user_id = ?) as is_saved
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ?`,
      [req.user.id, req.user.id, req.params.id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const post = {
      ...posts[0],
      is_liked: !!posts[0].is_liked,
      is_saved: !!posts[0].is_saved
    };

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = async (req, res) => {
  try {
    const [post] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);

    if (post.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post[0].user_id !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);

    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update post caption
// @route   PUT /api/posts/:id
// @access  Private
export const updatePost = async (req, res) => {
  try {
    const { caption } = req.body;
    const [posts] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);

    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (posts[0].user_id !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await pool.query('UPDATE posts SET caption = ? WHERE id = ?', [caption || '', req.params.id]);

    const [updated] = await pool.query(
      `SELECT p.*, u.username, u.profile_pic,
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
       (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
       (SELECT COUNT(*) FROM saves WHERE post_id = p.id) as save_count,
       (SELECT COUNT(*) > 0 FROM saves WHERE post_id = p.id AND user_id = ?) as is_saved
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ?`,
      [req.user.id, req.user.id, req.params.id]
    );

    res.json({
      ...updated[0],
      is_liked: !!updated[0].is_liked,
      is_saved: !!updated[0].is_saved
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
