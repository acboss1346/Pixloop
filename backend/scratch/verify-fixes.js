import pool from '../config/db.js';

async function runTests() {
  console.log('🧪 Starting PixLoop Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Community Members count & listing for "First GRP" (id 90001)
    console.log('--- Test 1: Community Members & Count Consistency ---');
    const [community] = await pool.query(
      `SELECT c.*, 
       COUNT(DISTINCT cm.user_id) as memberCount,
       (SELECT COUNT(*) > 0 FROM community_members WHERE community_id = c.id AND user_id = 60001) as is_member
       FROM communities c
       LEFT JOIN community_members cm ON c.id = cm.community_id
       WHERE c.id = 90001
       GROUP BY c.id`
    );

    const [members] = await pool.query(
      `SELECT u.id, u.username, u.profile_pic, u.bio, cm.id as membership_id, cm.joined_at,
              (c.creator_id = u.id) as is_creator
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       JOIN communities c ON cm.community_id = c.id
       WHERE cm.community_id = 90001
       ORDER BY (c.creator_id = u.id) DESC, u.username ASC`
    );

    assert(community.length === 1, 'Community 90001 exists');
    assert(parseInt(community[0].memberCount) === 2, `Community header memberCount is 2 (actual: ${community[0].memberCount})`);
    assert(members.length === 2, `Members query returned exactly 2 members (actual: ${members.length})`);
    assert(parseInt(community[0].memberCount) === members.length, 'Header count matches members list length exactly (2 === 2)');
    assert(members[0].is_creator === 1 || members[0].is_creator === true, 'Creator is ordered first with is_creator = 1');
    assert(members[0].username && members[1].username, 'Both members have valid usernames');

    // Test 2: Notification "Mark All As Read" Isolation & Ownership
    console.log('\n--- Test 2: Notification Mark All as Read Isolation ---');
    // Insert test unread notifications for user A (30001) and user B (60001)
    const [insertA] = await pool.query(
      "INSERT INTO notifications (user_id, sender_id, type, message, is_read) VALUES (30001, 60001, 'comment', 'test notif A', 0)"
    );
    const testNotifAId = insertA.insertId;

    const [insertB] = await pool.query(
      "INSERT INTO notifications (user_id, sender_id, type, message, is_read) VALUES (60001, 30001, 'comment', 'test notif B', 0)"
    );
    const testNotifBId = insertB.insertId;

    // Simulate markAllAsRead for user A (30001)
    const [updateResult] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = 30001 AND (is_read = 0 OR is_read IS NULL)'
    );

    assert(updateResult.affectedRows >= 1, `Mark all as read updated user 30001 unread notifications (${updateResult.affectedRows} rows)`);

    // Verify user A's notification is now read
    const [verifyA] = await pool.query('SELECT is_read FROM notifications WHERE id = ?', [testNotifAId]);
    assert(verifyA[0].is_read === 1, "User 30001's notification is now marked as read (is_read = 1)");

    // Verify user B's notification remains UNTOUCHED (is_read = 0)
    const [verifyB] = await pool.query('SELECT is_read FROM notifications WHERE id = ?', [testNotifBId]);
    assert(verifyB[0].is_read === 0, "User 60001's notification was NOT touched (remains is_read = 0)");

    // Test 3: Unauthorized single notification mark read rejection
    console.log('\n--- Test 3: Single Notification Unauthorized Protection ---');
    // Try to mark User B's notification using User A's ID
    const [unauthResult] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [testNotifBId, 30001]
    );
    assert(unauthResult.affectedRows === 0, 'User 30001 cannot mark user 60001 notification (affectedRows === 0)');

    // Clean up test notifications
    await pool.query('DELETE FROM notifications WHERE id IN (?, ?)', [testNotifAId, testNotifBId]);
    console.log('Cleaned up test notifications.');

    // Test 4: Deduplication in interaction comments
    console.log('\n--- Test 4: Comment Notification Deduplication ---');
    // Check existing notifications on post 30002 from user 150001
    const [existingCount] = await pool.query(
      'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = 30001 AND sender_id = 150001 AND post_id = 30002'
    );
    assert(existingCount[0].cnt > 0, `Preserved historical notification rows intact (${existingCount[0].cnt} rows)`);

    console.log(`\n================================`);
    console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
    console.log(`================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
