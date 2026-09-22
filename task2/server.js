const express = require('express');
const cors = require('cors');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'codealpha-social-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
db.initDatabase();

// Auth Middleware: optional auth (doesn't fail if no token, sets req.user if valid)
function authMiddlewareOptional(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Invalid token, continue as guest
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

// Auth Middleware: required auth
function authMiddlewareRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Helper to sign JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ================= AUTH ROUTES =================

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, full_name, email, password, bio, avatar_url } = req.body;

  if (!username || !full_name || !email || !password) {
    return res.status(400).json({ error: 'Username, full name, email, and password are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }

  if (db.getUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  if (db.getUserByEmail(email.trim())) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const defaultAvatar = avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`;

  try {
    const user = db.createUser(cleanUsername, full_name.trim(), email.trim(), passwordHash, bio || '', defaultAvatar);
    const token = generateToken(user);
    res.status(201).json({
      message: 'Account created successfully!',
      user,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create user account.' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  const input = usernameOrEmail.trim();
  const user = input.includes('@') ? db.getUserByEmail(input) : db.getUserByUsername(input);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    bio: user.bio,
    avatar_url: user.avatar_url,
    created_at: user.created_at
  };

  const token = generateToken(safeUser);
  res.json({
    message: 'Logged in successfully!',
    user: safeUser,
    token
  });
});

// Quick demo login (switch between seeded demo accounts easily)
app.post('/api/auth/quick-login', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  const user = db.getUserByUsername(username.trim());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    bio: user.bio,
    avatar_url: user.avatar_url,
    created_at: user.created_at
  };

  const token = generateToken(safeUser);
  res.json({
    message: `Switched to ${safeUser.full_name}`,
    user: safeUser,
    token
  });
});

// Current User info
app.get('/api/auth/me', authMiddlewareRequired, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// ================= USERS & PROFILES ROUTES =================

// List explore users
app.get('/api/users', authMiddlewareOptional, (req, res) => {
  const currentUserId = req.user ? req.user.id : null;
  const users = db.getAllUsers(currentUserId);
  res.json({ users });
});

// Get user profile by username
app.get('/api/users/:username', authMiddlewareOptional, (req, res) => {
  const currentUserId = req.user ? req.user.id : null;
  const profile = db.getUserProfile(req.params.username, currentUserId);
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.json({ profile });
});

// Update profile
app.put('/api/users/profile', authMiddlewareRequired, (req, res) => {
  const { full_name, bio, avatar_url } = req.body;
  try {
    const updated = db.updateUserProfile(req.user.id, { full_name, bio, avatar_url });
    res.json({ message: 'Profile updated successfully!', user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ================= POSTS ROUTES =================

// Get all posts (or filtered by user)
app.get('/api/posts', authMiddlewareOptional, (req, res) => {
  const currentUserId = req.user ? req.user.id : null;
  const filterUserId = req.query.userId ? parseInt(req.query.userId, 10) : null;
  const posts = db.getPosts(currentUserId, filterUserId);
  res.json({ posts });
});

// Get single post
app.get('/api/posts/:id', authMiddlewareOptional, (req, res) => {
  const currentUserId = req.user ? req.user.id : null;
  const post = db.getPostById(req.params.id, currentUserId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  res.json({ post });
});

// Create post
app.post('/api/posts', authMiddlewareRequired, (req, res) => {
  const { content, image_url } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  }

  try {
    const post = db.createPost(req.user.id, content.trim(), image_url ? image_url.trim() : '');
    res.status(201).json({ message: 'Post created successfully!', post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// Delete post
app.delete('/api/posts/:id', authMiddlewareRequired, (req, res) => {
  const result = db.deletePost(parseInt(req.params.id, 10), req.user.id);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ message: 'Post deleted successfully!' });
});

// ================= COMMENTS ROUTES =================

// Get comments for a post
app.get('/api/posts/:id/comments', (req, res) => {
  const comments = db.getComments(parseInt(req.params.id, 10));
  res.json({ comments });
});

// Add comment to a post
app.post('/api/posts/:id/comments', authMiddlewareRequired, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  const post = db.getPostById(req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  try {
    const comment = db.createComment(parseInt(req.params.id, 10), req.user.id, content.trim());
    res.status(201).json({ message: 'Comment added!', comment });
  } catch (err) {
    console.error('Comment creation error:', err);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// ================= LIKES ROUTES =================

// Toggle like
app.post('/api/posts/:id/like', authMiddlewareRequired, (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const post = db.getPostById(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  try {
    const result = db.toggleLike(postId, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Like toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle like.' });
  }
});

// ================= FOLLOWS ROUTES =================

// Toggle follow
app.post('/api/users/:id/follow', authMiddlewareRequired, (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'You cannot follow yourself.' });
  }

  const targetUser = db.getUserById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  try {
    const result = db.toggleFollow(req.user.id, targetUserId);
    res.json({
      message: result.following ? `You are now following ${targetUser.full_name}` : `Unfollowed ${targetUser.full_name}`,
      ...result
    });
  } catch (err) {
    console.error('Follow toggle error:', err);
    res.status(500).json({ error: err.message || 'Failed to toggle follow.' });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Social Media Platform running at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`=========================================`);
});
