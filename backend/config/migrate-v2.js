import pool from './db.js';

/**
 * PixLoop v2 Migration
 * Adds: messaging features (is_read, attachments, replies, edit),
 *        profile fields (bio, cover_pic), message reactions,
 *        notification enhancements, and indexes.
 * 
 * Safe to run multiple times — each ALTER is wrapped in try/catch.
 */
async function migrate() {
  const run = async (label, sql) => {
    try {
      await pool.query(sql);
      console.log(`✅ ${label}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.message.includes('Duplicate')) {
        console.log(`⏭️  ${label} (already exists)`);
      } else {
        console.error(`❌ ${label}: ${err.message}`);
      }
    }
  };

  console.log('\n🚀 Running PixLoop v2 migrations...\n');

  // === MESSAGES TABLE FIXES ===
  await run('Add is_read to messages', 
    'ALTER TABLE messages ADD COLUMN is_read TINYINT(1) DEFAULT 0');
  
  await run('Add is_edited to messages',
    'ALTER TABLE messages ADD COLUMN is_edited TINYINT(1) DEFAULT 0');
  
  await run('Add reply_to_id to messages',
    'ALTER TABLE messages ADD COLUMN reply_to_id INT DEFAULT NULL');
  
  await run('Add attachment_url to messages',
    'ALTER TABLE messages ADD COLUMN attachment_url VARCHAR(500) DEFAULT NULL');
  
  await run('Add attachment_type to messages',
    'ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(50) DEFAULT NULL');
  
  await run('Add attachment_name to messages',
    'ALTER TABLE messages ADD COLUMN attachment_name VARCHAR(255) DEFAULT NULL');
  
  await run('Add attachment_size to messages',
    'ALTER TABLE messages ADD COLUMN attachment_size INT DEFAULT NULL');

  // === USERS TABLE ENHANCEMENTS ===
  await run('Add bio to users',
    'ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL');
  
  await run('Add cover_pic to users',
    'ALTER TABLE users ADD COLUMN cover_pic VARCHAR(500) DEFAULT NULL');

  // === MESSAGE REACTIONS TABLE ===
  await run('Create message_reactions table',
    `CREATE TABLE IF NOT EXISTS message_reactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_id INT NOT NULL,
      user_id INT NOT NULL,
      emoji VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id, emoji),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

  // === NOTIFICATION ENHANCEMENTS ===
  await run('Add message column to notifications',
    'ALTER TABLE notifications ADD COLUMN message TEXT DEFAULT NULL');
  
  await run('Add community_id to notifications',
    'ALTER TABLE notifications ADD COLUMN community_id INT DEFAULT NULL');

  // === INDEXES ===
  await run('Index messages(sender_id, receiver_id)',
    'CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id)');
  
  await run('Index messages(receiver_id, is_read)',
    'CREATE INDEX idx_messages_receiver_read ON messages(receiver_id, is_read)');
  
  await run('Index notifications(user_id, is_read)',
    'CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read)');

  console.log('\n✨ Migration complete!\n');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
