import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    if (result.insertId) {
      res.status(201).json({
        _id: result.insertId,
        username,
        email,
        token: generateToken(result.insertId),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        username: user.username,
        email: user.email,
        profile_pic: user.profile_pic,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, profile_pic, notifications_enabled FROM users WHERE id = ?', [req.user.id]);
    res.status(200).json(users[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Toggle notifications setting
// @route   PUT /api/auth/notifications-settings
// @access  Private
export const toggleNotifications = async (req, res) => {
  try {
    const { enabled } = req.body;
    await pool.query('UPDATE users SET notifications_enabled = ? WHERE id = ?', [enabled, req.user.id]);
    res.json({ message: 'Notification settings updated', enabled });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.id;

    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username or email already taken' });
    }

    await pool.query(
      'UPDATE users SET username = ?, email = ? WHERE id = ?',
      [username, email, userId]
    );

    const [updated] = await pool.query(
      'SELECT id, username, email, profile_pic, notifications_enabled FROM users WHERE id = ?',
      [userId]
    );

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

import { uploadOnCloudinary } from '../utils/cloudinary.js';

// @desc    Update user profile picture
// @route   PUT /api/auth/profile-pic
// @access  Private
export const updateProfilePic = async (req, res) => {
  try {
    const userId = req.user.id;
    let profilePicUrl = null;

    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image file' });
    }

    const uploadResult = await uploadOnCloudinary(req.file.path);
    if (uploadResult) {
      profilePicUrl = uploadResult.secure_url;
    } else {
      return res.status(500).json({ message: 'Failed to upload image' });
    }

    await pool.query(
      'UPDATE users SET profile_pic = ? WHERE id = ?',
      [profilePicUrl, userId]
    );

    const [updated] = await pool.query(
      'SELECT id, username, email, profile_pic, notifications_enabled FROM users WHERE id = ?',
      [userId]
    );

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    if (!query) {
      return res.json([]);
    }
    const [users] = await pool.query(
      'SELECT id, username, profile_pic FROM users WHERE username LIKE ? AND id != ? LIMIT 10',
      [`%${query}%`, req.user.id]
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get user profile by username
// @route   GET /api/auth/user/:username
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const [users] = await pool.query(
      'SELECT id, username, email, profile_pic FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = users[0];
    
    // Get friendship status if target is not the current user
    let friendship = null;
    if (targetUser.id !== req.user.id) {
      const [relation] = await pool.query(
        'SELECT id, sender_id, receiver_id, status FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
        [req.user.id, targetUser.id, targetUser.id, req.user.id]
      );
      if (relation.length > 0) {
        friendship = relation[0];
      }
    }

    res.json({
      ...targetUser,
      friendship
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
