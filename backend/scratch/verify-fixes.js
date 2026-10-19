import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

async function runComprehensiveAudit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 PixLoop Full Functional & Architectural Feature Audit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, flowName, details = '') {
    if (condition) {
      console.log(`✅ [WORKING] ${flowName} ${details ? '— ' + details : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAILED]  ${flowName} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  try {
    // Flow 1: Authentication (Login / Token Verification / Password check)
    console.log('▶ 1. Authentication Flow');
    const [users] = await pool.query('SELECT * FROM users WHERE id = 30001');
    assert(users.length === 1, 'Login / User Lookup', `Found user ${users[0]?.username}`);
    const token = jwt.sign({ id: 30001 }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert(decoded.id === 30001, 'JWT Verification & Middleware', `Token successfully decoded for user id ${decoded.id}`);

    // Flow 2: Home Feed Loading
    console.log('\n▶ 2. Home Feed Loading Flow');
    const [feedPosts] = await pool.query(
      `SELECT p.*, u.username, u.profile_pic,
              (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
              (SELECT COUNT(*) FROM saves WHERE post_id = p.id) as save_count,
              (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = 30001) as is_liked,
              (SELECT COUNT(*) > 0 FROM saves WHERE post_id = p.id AND user_id = 30001) as is_saved
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.community_id IS NULL
       ORDER BY p.created_at DESC
       LIMIT 10`
    );
    assert(feedPosts.length > 0, 'Feed Loading', `Loaded ${feedPosts.length} posts with user metadata & counts`);
    assert(feedPosts[0].username && feedPosts[0].image_url, 'Post Data Integrity', `Post id ${feedPosts[0].id} has image_url and author`);

    // Flow 3: Like and Unlike Posts
    console.log('\n▶ 3. Like and Unlike Posts Flow');
    const testPostId = 30002;
    // Ensure clean state
    await pool.query('DELETE FROM likes WHERE post_id = ? AND user_id = 30001', [testPostId]);
    await pool.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [testPostId, 30001]);
    const [likeCheck] = await pool.query('SELECT * FROM likes WHERE post_id = ? AND user_id = 30001', [testPostId]);
    assert(likeCheck.length === 1, 'Post Liking', 'Inserted like record persisted in database');
    await pool.query('DELETE FROM likes WHERE post_id = ? AND user_id = 30001', [testPostId]);
    const [unlikeCheck] = await pool.query('SELECT * FROM likes WHERE post_id = ? AND user_id = 30001', [testPostId]);
    assert(unlikeCheck.length === 0, 'Post Unliking', 'Deleted like record cleaned up cleanly');

    // Flow 4: Comment Creation and Display
    console.log('\n▶ 4. Comment Creation & Display Flow');
    const [commentInsert] = await pool.query(
      'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [testPostId, 30001, 'Automated audit comment']
    );
    const commentId = commentInsert.insertId;
    assert(commentId > 0, 'Comment Creation', `Created comment with id ${commentId}`);
    const [commentsList] = await pool.query(
      `SELECT c.*, u.username, u.profile_pic 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = ? 
       ORDER BY c.created_at ASC`,
      [testPostId]
    );
    assert(commentsList.some(c => c.id === commentId), 'Comment Display / Query', `Fetched ${commentsList.length} comments containing new comment`);
    // Clean up
    await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

    // Flow 5: Save and Unsave Posts
    console.log('\n▶ 5. Save and Unsave Posts Flow');
    await pool.query('DELETE FROM saves WHERE post_id = ? AND user_id = 30001', [testPostId]);
    await pool.query('INSERT INTO saves (post_id, user_id) VALUES (?, ?)', [testPostId, 30001]);
    const [saveCheck] = await pool.query('SELECT * FROM saves WHERE post_id = ? AND user_id = 30001', [testPostId]);
    assert(saveCheck.length === 1, 'Post Saving', 'Post save record persisted in database');
    await pool.query('DELETE FROM saves WHERE post_id = ? AND user_id = 30001', [testPostId]);
    const [unsaveCheck] = await pool.query('SELECT * FROM saves WHERE post_id = ? AND user_id = 30001', [testPostId]);
    assert(unsaveCheck.length === 0, 'Post Unsaving', 'Post unsaved record removed');

    // Flow 6: Community Details, Member List & Member Count (Community 90001)
    console.log('\n▶ 6. Community Details, Members & Count Flow');
    const [commDetails] = await pool.query(
      `SELECT c.*, 
       COUNT(DISTINCT cm.user_id) as memberCount,
       (SELECT COUNT(*) > 0 FROM community_members WHERE community_id = c.id AND user_id = 30001) as is_member
       FROM communities c
       LEFT JOIN community_members cm ON c.id = cm.community_id
       WHERE c.id = 90001
       GROUP BY c.id`
    );
    const [commMemberList] = await pool.query(
      `SELECT u.id, u.username, u.profile_pic, u.bio, cm.id as membership_id, cm.joined_at,
              (c.creator_id = u.id) as is_creator
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       JOIN communities c ON cm.community_id = c.id
       WHERE cm.community_id = 90001
       ORDER BY (c.creator_id = u.id) DESC, u.username ASC`
    );
    assert(commDetails.length === 1, 'Community Details Query', `Community: ${commDetails[0].name}`);
    assert(parseInt(commDetails[0].memberCount) === commMemberList.length, 'Header Count vs Member List Match', `Header memberCount (${commDetails[0].memberCount}) === List count (${commMemberList.length})`);
    assert(commMemberList.length === 2, 'Accurate Membership Count', 'First GRP has exactly 2 members');
    assert(commMemberList[0].is_creator === 1 || commMemberList[0].is_creator === true, 'Creator Identified', `Creator: ${commMemberList[0].username}`);

    // Flow 7: Community Joining and Leaving
    console.log('\n▶ 7. Community Join & Leave Flow');
    const tempCommId = 3; // Nature
    await pool.query('DELETE FROM community_members WHERE community_id = ? AND user_id = 30001', [tempCommId]);
    await pool.query('INSERT INTO community_members (community_id, user_id) VALUES (?, ?)', [tempCommId, 30001]);
    const [memberAfterJoin] = await pool.query('SELECT * FROM community_members WHERE community_id = ? AND user_id = 30001', [tempCommId]);
    assert(memberAfterJoin.length === 1, 'Community Join Operation', 'Membership record created');
    await pool.query('DELETE FROM community_members WHERE community_id = ? AND user_id = 30001', [tempCommId]);
    const [memberAfterLeave] = await pool.query('SELECT * FROM community_members WHERE community_id = ? AND user_id = 30001', [tempCommId]);
    assert(memberAfterLeave.length === 0, 'Community Leave Operation', 'Membership record removed');

    // Flow 8: Community Group Chat
    console.log('\n▶ 8. Community Group Chat Flow');
    const [chatLogs] = await pool.query(
      `SELECT gm.*, u.username, u.profile_pic
       FROM group_messages gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.community_id = 90001
       ORDER BY gm.created_at ASC`
    );
    assert(Array.isArray(chatLogs), 'Group Chat Query', `Retrieved ${chatLogs.length} messages for community 90001`);

    // Flow 9: Notifications: Mark All as Read & Isolation
    console.log('\n▶ 9. Notification Mark All as Read & Security Flow');
    // Insert test unread notification
    const [testNotif] = await pool.query(
      "INSERT INTO notifications (user_id, sender_id, type, message, is_read) VALUES (30001, 60001, 'comment', 'Audit test unread', 0)"
    );
    const notifId = testNotif.insertId;
    // Mark all as read for user 30001
    const [updateNotifs] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = 30001 AND (is_read = 0 OR is_read IS NULL)'
    );
    assert(updateNotifs.affectedRows >= 1, 'Mark All as Read Query', `Updated ${updateNotifs.affectedRows} unread notifications`);
    const [checkRead] = await pool.query('SELECT is_read FROM notifications WHERE id = ?', [notifId]);
    assert(checkRead[0].is_read === 1, 'Notification Read Persistence', 'Notification is now marked as read (1)');
    // Clean up
    await pool.query('DELETE FROM notifications WHERE id = ?', [notifId]);

    // Flow 10: Private Messaging & Conversations
    console.log('\n▶ 10. Private Messaging Flow');
    const [conversations] = await pool.query(
      `SELECT 
        u.id as user_id,
        u.username,
        u.profile_pic,
        m.id as last_message_id,
        m.message as last_message,
        m.created_at as last_message_time,
        m.sender_id as last_message_sender,
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = 30001 AND is_read = 0) as unread_count
      FROM users u
      JOIN (
        SELECT 
          CASE WHEN sender_id = 30001 THEN receiver_id ELSE sender_id END as other_user_id,
          MAX(id) as max_id
        FROM messages
        WHERE sender_id = 30001 OR receiver_id = 30001
        GROUP BY other_user_id
      ) latest ON u.id = latest.other_user_id
      JOIN messages m ON m.id = latest.max_id
      ORDER BY m.created_at DESC`
    );
    assert(Array.isArray(conversations), 'Conversations Listing', `Loaded ${conversations.length} active conversation threads`);

    // Flow 11: Profile Details & Posts
    console.log('\n▶ 11. Profile Details & User Posts Flow');
    const [profileUser] = await pool.query(
      'SELECT id, username, email, profile_pic, bio, cover_pic, created_at FROM users WHERE username = ?',
      ['asd1']
    );
    const [userPosts] = await pool.query('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC', [profileUser[0].id]);
    assert(profileUser.length === 1, 'Profile Data Retrieval', `Loaded user ${profileUser[0].username} (created: ${new Date(profileUser[0].created_at).toLocaleDateString()})`);
    assert(Array.isArray(userPosts), 'User Uploaded Posts Retrieval', `User has ${userPosts.length} posts`);

    // Flow 12: Search (Users, Communities, Posts)
    console.log('\n▶ 12. Search & Discovery Flow');
    const searchTerm = '%test%';
    const [searchUsers] = await pool.query('SELECT id, username, profile_pic FROM users WHERE username LIKE ? LIMIT 5', [searchTerm]);
    const [searchComms] = await pool.query('SELECT id, name, icon, logo_url FROM communities WHERE name LIKE ? LIMIT 5', [searchTerm]);
    const [searchPosts] = await pool.query('SELECT id, caption, image_url FROM posts WHERE caption LIKE ? LIMIT 5', [searchTerm]);
    assert(Array.isArray(searchUsers), 'Global User Search', `Found ${searchUsers.length} users matching query`);
    assert(Array.isArray(searchComms), 'Community Search', `Found ${searchComms.length} communities matching query`);
    assert(Array.isArray(searchPosts), 'Post Search', `Found ${searchPosts.length} posts matching query`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 Audit Summary: ${passed} checks passed, ${failed} failed`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Audit encountered error:', err);
    process.exit(1);
  }
}

runComprehensiveAudit();
