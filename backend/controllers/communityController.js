import pool from '../config/db.js';

// @desc    Get all communities with member counts
// @route   GET /api/communities
// @access  Public
export const getCommunities = async (req, res) => {
  try {
    const [communities] = await pool.query(
      `SELECT c.*, 
       COUNT(DISTINCT cm.user_id) as memberCount,
       (SELECT COUNT(*) > 0 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_member
       FROM communities c
       LEFT JOIN community_members cm ON c.id = cm.community_id
       GROUP BY c.id
       ORDER BY memberCount DESC
       LIMIT 10`,
      [req.user.id]
    );

    const formattedCommunities = communities.map(c => ({
      ...c,
      is_member: !!c.is_member
    }));

    res.json({ success: true, data: formattedCommunities });
  } catch (error) {
    console.error('getCommunities ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get trending hashtags
// @route   GET /api/trending/hashtags
// @access  Public
export const getTrendingHashtags = async (req, res) => {
  try {
    const [trending] = await pool.query(
      `SELECT hashtag, 
       COUNT(*) as postCount
       FROM post_hashtags
       GROUP BY hashtag
       ORDER BY postCount DESC
       LIMIT 5`
    );

    const formattedTrending = trending.map(item => ({
      id: item.hashtag,
      hashtag: item.hashtag.startsWith('#') ? item.hashtag : '#' + item.hashtag,
      postCount: item.postCount,
      trend: 'up'
    }));

    res.json({ success: true, data: formattedTrending });
  } catch (error) {
    console.error('getTrendingHashtags ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Join a community
// @route   POST /api/communities/:id/join
// @access  Private
export const joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already a member
    const [existing] = await pool.query(
      'SELECT * FROM community_members WHERE user_id = ? AND community_id = ?',
      [userId, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    await pool.query(
      'INSERT INTO community_members (user_id, community_id) VALUES (?, ?)',
      [userId, id]
    );

    res.json({ success: true, message: 'Joined community successfully' });
  } catch (error) {
    console.error('joinCommunity ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

import { uploadOnCloudinary } from '../utils/cloudinary.js';

// @desc    Create a community
// @route   POST /api/communities
// @access  Private
export const createCommunity = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const userId = req.user.id;
    let logoUrl = null;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Community name is required' });
    }

    const [existing] = await pool.query('SELECT * FROM communities WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Community already exists' });
    }

    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      if (uploadResult) {
        logoUrl = uploadResult.secure_url;
      }
    }

    const [result] = await pool.query(
      'INSERT INTO communities (name, description, icon, logo_url, creator_id) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', icon || '🌟', logoUrl, userId]
    );

    const newCommunityId = result.insertId;

    // Make the creator a member automatically
    await pool.query(
      'INSERT INTO community_members (user_id, community_id) VALUES (?, ?)',
      [userId, newCommunityId]
    );

    const [newCommunity] = await pool.query('SELECT * FROM communities WHERE id = ?', [newCommunityId]);

    res.status(201).json({ success: true, data: { ...newCommunity[0], memberCount: 1 } });
  } catch (error) {
    console.error('createCommunity ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get a community by ID
// @route   GET /api/communities/:id
// @access  Protected
export const getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const [community] = await pool.query(
      `SELECT c.*, 
       COUNT(DISTINCT cm.user_id) as memberCount,
       (SELECT COUNT(*) > 0 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_member
       FROM communities c
       LEFT JOIN community_members cm ON c.id = cm.community_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [req.user.id, id]
    );

    if (community.length === 0) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const formattedCommunity = {
      ...community[0],
      is_member: !!community[0].is_member
    };

    res.json({ success: true, data: formattedCommunity });
  } catch (error) {
    console.error('getCommunityById ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a community
// @route   DELETE /api/communities/:id
// @access  Protected
export const deleteCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [community] = await pool.query('SELECT * FROM communities WHERE id = ?', [id]);
    
    if (community.length === 0) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community[0].creator_id !== userId) {
      return res.status(401).json({ success: false, message: 'User not authorized to delete this community' });
    }

    await pool.query('DELETE FROM communities WHERE id = ?', [id]);

    res.json({ success: true, message: 'Community deleted' });
  } catch (error) {
    console.error('deleteCommunity ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Update a community
// @route   PUT /api/communities/:id
// @access  Protected
export const updateCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    const [community] = await pool.query('SELECT * FROM communities WHERE id = ?', [id]);
    
    if (community.length === 0) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (community[0].creator_id !== userId) {
      return res.status(401).json({ success: false, message: 'User not authorized to edit this community' });
    }

    let logoUrl = community[0].logo_url;

    if (req.file) {
      const uploadResult = await uploadOnCloudinary(req.file.path);
      if (uploadResult) {
        logoUrl = uploadResult.secure_url;
      }
    }

    await pool.query(
      'UPDATE communities SET name = ?, description = ?, logo_url = ? WHERE id = ?',
      [name || community[0].name, description || '', logoUrl, id]
    );

    const [updated] = await pool.query(
      `SELECT c.*, 
       COUNT(DISTINCT cm.user_id) as memberCount,
       (SELECT COUNT(*) > 0 FROM community_members WHERE community_id = c.id AND user_id = ?) as is_member
       FROM communities c
       LEFT JOIN community_members cm ON c.id = cm.community_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [userId, id]
    );

    res.json({ success: true, data: { ...updated[0], is_member: !!updated[0].is_member } });
  } catch (error) {
    console.error('updateCommunity ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all chat messages inside a community
// @route   GET /api/communities/:id/chat
// @access  Protected
export const getCommunityMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if the community exists
    const [community] = await pool.query('SELECT * FROM communities WHERE id = ?', [id]);
    if (community.length === 0) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Verify if user is member of the community
    const [member] = await pool.query('SELECT * FROM community_members WHERE community_id = ? AND user_id = ?', [id, userId]);
    if (member.length === 0) {
      return res.status(403).json({ success: false, message: 'You must join the community to view group chats' });
    }

    const [messages] = await pool.query(
      `SELECT gm.*, u.username, u.profile_pic
       FROM group_messages gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.community_id = ?
       ORDER BY gm.created_at ASC`,
      [id]
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('getCommunityMessages ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Post a chat message inside a community
// @route   POST /api/communities/:id/chat
// @access  Protected
export const sendCommunityMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    // Verify if user is member of the community
    const [member] = await pool.query('SELECT * FROM community_members WHERE community_id = ? AND user_id = ?', [id, userId]);
    if (member.length === 0) {
      return res.status(403).json({ success: false, message: 'You must join the community to send chat messages' });
    }

    const [result] = await pool.query(
      'INSERT INTO group_messages (community_id, user_id, message) VALUES (?, ?, ?)',
      [id, userId, message.trim()]
    );

    const [newMsg] = await pool.query(
      `SELECT gm.*, u.username, u.profile_pic
       FROM group_messages gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: newMsg[0] });
  } catch (error) {
    console.error('sendCommunityMessage ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
