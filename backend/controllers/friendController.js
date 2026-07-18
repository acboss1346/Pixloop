import pool from '../config/db.js';

// @desc    Send a friend request
// @route   POST /api/friends/request
// @access  Private
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    if (parseInt(receiver_id) === senderId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    // Check if receiver exists
    const [receiver] = await pool.query('SELECT id FROM users WHERE id = ?', [receiver_id]);
    if (receiver.length === 0) {
      return res.status(404).json({ message: 'Receiver user not found' });
    }

    // Check for existing request
    const [existing] = await pool.query(
      'SELECT id, status FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      [senderId, receiver_id, receiver_id, senderId]
    );

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user' });
      } else {
        return res.status(400).json({ message: 'A pending friend request already exists between you' });
      }
    }

    await pool.query(
      'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, ?)',
      [senderId, receiver_id, 'pending']
    );

    res.status(201).json({ message: 'Friend request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all friends (accepted status)
// @route   GET /api/friends
// @access  Private
export const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const [friends] = await pool.query(
      `SELECT u.id, u.username, u.profile_pic, u.email
       FROM users u
       WHERE u.id IN (
         SELECT receiver_id FROM friend_requests WHERE sender_id = ? AND status = 'accepted'
         UNION
         SELECT sender_id FROM friend_requests WHERE receiver_id = ? AND status = 'accepted'
       )`,
      [userId, userId]
    );

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get incoming requests
    const [incoming] = await pool.query(
      `SELECT fr.*, u.username as sender_username, u.profile_pic as sender_pic, u.email as sender_email
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'`,
      [userId]
    );

    // Get outgoing requests
    const [outgoing] = await pool.query(
      `SELECT fr.*, u.username as receiver_username, u.profile_pic as receiver_pic, u.email as receiver_email
       FROM friend_requests fr
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.sender_id = ? AND fr.status = 'pending'`,
      [userId]
    );

    res.json({ incoming, outgoing });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Accept a friend request
// @route   PUT /api/friends/request/:id/accept
// @access  Private
export const acceptFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;

    // Check request
    const [request] = await pool.query(
      'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ?',
      [requestId, userId]
    );

    if (request.length === 0) {
      return res.status(404).json({ message: 'Pending friend request not found or unauthorized' });
    }

    await pool.query(
      'UPDATE friend_requests SET status = ? WHERE id = ?',
      ['accepted', requestId]
    );

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Decline or cancel a friend request (or remove a friend)
// @route   DELETE /api/friends/request/:id
// @access  Private
export const removeFriendship = async (req, res) => {
  try {
    const friendshipId = req.params.id;
    const userId = req.user.id;

    // Verify ownership
    const [friendship] = await pool.query(
      'SELECT * FROM friend_requests WHERE id = ? AND (sender_id = ? OR receiver_id = ?)',
      [friendshipId, userId, userId]
    );

    if (friendship.length === 0) {
      return res.status(404).json({ message: 'Friendship or request not found' });
    }

    await pool.query('DELETE FROM friend_requests WHERE id = ?', [friendshipId]);

    res.json({ message: 'Friendship or request removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
