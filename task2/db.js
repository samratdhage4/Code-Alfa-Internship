const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'social.db');
const db = new DatabaseSync(dbPath);

// Initialize SQLite schema
function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

// Seed demo users and initial data if database is empty
function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) return;

  console.log('Seeding initial social media data...');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, bio, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'alice',
    'Alice Johnson',
    'alice@example.com',
    passwordHash,
    'Full-stack developer, open-source enthusiast, and coffee addict ☕',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  );

  insertUser.run(
    'bob',
    'Bob Smith',
    'bob@example.com',
    passwordHash,
    'Building modern web apps & exploring cloud computing 🚀',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  );

  insertUser.run(
    'charlie',
    'Charlie Davis',
    'charlie@example.com',
    passwordHash,
    'Product designer & digital artist crafting clean interfaces ✨',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
  );

  // Insert initial follows (Alice follows Bob & Charlie; Bob follows Alice)
  const insertFollow = db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
  insertFollow.run(1, 2); // Alice -> Bob
  insertFollow.run(1, 3); // Alice -> Charlie
  insertFollow.run(2, 1); // Bob -> Alice

  // Insert sample posts
  const insertPost = db.prepare('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)');
  insertPost.run(
    1,
    'Excited to launch our new mini social media app! Pure JavaScript, Express, and SQLite under the hood. What do you all think? 🚀',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=700&auto=format&fit=crop&q=80'
  );

  insertPost.run(
    2,
    'Just finished an intense coding session. Remember to take breaks, drink water, and keep building awesome things every day! 💻✨',
    ''
  );

  insertPost.run(
    3,
    'Exploring minimal card UI designs today. Clean lines, subtle shadows, and readable typography make all the difference.',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=700&auto=format&fit=crop&q=80'
  );

  // Insert sample likes
  const insertLike = db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)');
  insertLike.run(1, 2); // Bob liked Alice's post
  insertLike.run(1, 3); // Charlie liked Alice's post
  insertLike.run(2, 1); // Alice liked Bob's post

  // Insert sample comments
  const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
  insertComment.run(1, 2, 'Looks super clean Alice! Love the responsiveness.');
  insertComment.run(1, 3, 'Great job! The database integration is spot on.');
  insertComment.run(2, 1, 'Well said Bob! Breaks are so essential.');

  console.log('Seeding completed successfully!');
}

// User helper queries
function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT id, username, full_name, email, bio, avatar_url, created_at FROM users WHERE id = ?').get(id);
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
}

function createUser(username, fullName, email, passwordHash, bio = '', avatarUrl = '') {
  const stmt = db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, bio, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(username, fullName, email, passwordHash, bio, avatarUrl);
  return getUserById(result.lastInsertRowid);
}

function updateUserProfile(id, { full_name, bio, avatar_url }) {
  const stmt = db.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url)
    WHERE id = ?
  `);
  stmt.run(full_name, bio, avatar_url, id);
  return getUserById(id);
}

// Get user profile details with follower/following stats and is_following flag
function getUserProfile(username, currentUserId = null) {
  const user = getUserByUsername(username);
  if (!user) return null;

  const followersCount = db.prepare('SELECT COUNT(*) AS count FROM follows WHERE following_id = ?').get(user.id).count;
  const followingCount = db.prepare('SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?').get(user.id).count;
  const postsCount = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE user_id = ?').get(user.id).count;

  let isFollowing = false;
  if (currentUserId && currentUserId !== user.id) {
    const followRecord = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, user.id);
    isFollowing = !!followRecord;
  }

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    bio: user.bio,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
    followers_count: followersCount,
    following_count: followingCount,
    posts_count: postsCount,
    is_following: isFollowing,
    is_self: currentUserId === user.id
  };
}

// Get list of users with follower counts and follow status relative to current user
function getAllUsers(currentUserId = null) {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.bio, u.avatar_url, u.created_at,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count
    FROM users u
    ORDER BY u.id ASC
  `).all();

  return users.map(u => {
    let isFollowing = false;
    if (currentUserId && currentUserId !== u.id) {
      const followRecord = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, u.id);
      isFollowing = !!followRecord;
    }
    return {
      ...u,
      is_following: isFollowing,
      is_self: currentUserId === u.id
    };
  });
}

// Posts queries
function getPosts(currentUserId = null, filterUserId = null) {
  let query = `
    SELECT p.id, p.content, p.image_url, p.created_at,
           u.id AS author_id, u.username AS author_username, u.full_name AS author_name, u.avatar_url AS author_avatar,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
  `;

  const params = [];
  if (filterUserId) {
    query += ' WHERE p.user_id = ?';
    params.push(filterUserId);
  }

  query += ' ORDER BY p.id DESC';

  const posts = db.prepare(query).all(...params);

  return posts.map(post => {
    let isLiked = false;
    if (currentUserId) {
      const like = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, currentUserId);
      isLiked = !!like;
    }
    return {
      ...post,
      is_liked: isLiked
    };
  });
}

function getPostById(id, currentUserId = null) {
  const post = db.prepare(`
    SELECT p.id, p.content, p.image_url, p.created_at,
           u.id AS author_id, u.username AS author_username, u.full_name AS author_name, u.avatar_url AS author_avatar,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(id);

  if (!post) return null;

  let isLiked = false;
  if (currentUserId) {
    const like = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, currentUserId);
    isLiked = !!like;
  }

  return { ...post, is_liked: isLiked };
}

function createPost(userId, content, imageUrl = '') {
  const stmt = db.prepare('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)');
  const result = stmt.run(userId, content, imageUrl);
  return getPostById(result.lastInsertRowid, userId);
}

function deletePost(postId, userId) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post) return { error: 'Post not found', status: 404 };
  if (post.user_id !== userId) return { error: 'Unauthorized to delete this post', status: 403 };

  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
  return { success: true };
}

// Comments queries
function getComments(postId) {
  return db.prepare(`
    SELECT c.id, c.content, c.created_at,
           u.id AS author_id, u.username AS author_username, u.full_name AS author_name, u.avatar_url AS author_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.id ASC
  `).all(postId);
}

function createComment(postId, userId, content) {
  const stmt = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
  const result = stmt.run(postId, userId, content);
  return db.prepare(`
    SELECT c.id, c.content, c.created_at,
           u.id AS author_id, u.username AS author_username, u.full_name AS author_name, u.avatar_url AS author_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);
}

// Likes toggle
function toggleLike(postId, userId) {
  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    const count = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(postId).count;
    return { liked: false, likes_count: count };
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
    const count = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(postId).count;
    return { liked: true, likes_count: count };
  }
}

// Follows toggle
function toggleFollow(followerId, followingId) {
  if (followerId === followingId) {
    throw new Error('You cannot follow yourself');
  }

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(followerId, followingId);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    const followersCount = db.prepare('SELECT COUNT(*) AS count FROM follows WHERE following_id = ?').get(followingId).count;
    return { following: false, followers_count: followersCount };
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(followerId, followingId);
    const followersCount = db.prepare('SELECT COUNT(*) AS count FROM follows WHERE following_id = ?').get(followingId).count;
    return { following: true, followers_count: followersCount };
  }
}

module.exports = {
  db,
  initDatabase,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  createUser,
  updateUserProfile,
  getUserProfile,
  getAllUsers,
  getPosts,
  getPostById,
  createPost,
  deletePost,
  getComments,
  createComment,
  toggleLike,
  toggleFollow
};
