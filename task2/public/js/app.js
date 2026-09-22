/**
 * Pulse - Mini Social Media Platform
 * Client Application Logic
 */

// State
let currentUser = null;
let authToken = localStorage.getItem('pulse_token') || null;
let currentView = 'feed'; // 'feed' | 'explore' | 'profile'
let feedFilter = 'all'; // 'all' | 'my'
let viewingProfileUsername = null;
let activeCommentsPostId = null;

// DOM Elements
const navFeedBtn = document.getElementById('navFeedBtn');
const navExploreBtn = document.getElementById('navExploreBtn');
const navProfileBtn = document.getElementById('navProfileBtn');
const logoBtn = document.getElementById('logoBtn');
const navAuthArea = document.getElementById('navAuthArea');
const quickSwitcher = document.getElementById('quickSwitcher');
const sidebarUserCard = document.getElementById('sidebarUserCard');

const feedSection = document.getElementById('feedSection');
const exploreSection = document.getElementById('exploreSection');
const profileSection = document.getElementById('profileSection');

const postsContainer = document.getElementById('postsContainer');
const createPostAvatar = document.getElementById('createPostAvatar');
const postContentInput = document.getElementById('postContentInput');
const postImageUrlInput = document.getElementById('postImageUrlInput');
const postImageField = document.getElementById('postImageField');
const toggleImageBtn = document.getElementById('toggleImageBtn');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
const submitPostBtn = document.getElementById('submitPostBtn');

const exploreContainer = document.getElementById('exploreContainer');
const suggestedUsersContainer = document.getElementById('suggestedUsersContainer');

const profileHeaderCard = document.getElementById('profileHeaderCard');
const profilePostsContainer = document.getElementById('profilePostsContainer');
const profilePostsTitle = document.getElementById('profilePostsTitle');

// Modals
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authModalTitle = document.getElementById('authModalTitle');

const editProfileModal = document.getElementById('editProfileModal');
const closeEditProfileModal = document.getElementById('closeEditProfileModal');
const editProfileForm = document.getElementById('editProfileForm');
const editFullName = document.getElementById('editFullName');
const editBio = document.getElementById('editBio');
const editAvatarUrl = document.getElementById('editAvatarUrl');

const toastContainer = document.getElementById('toastContainer');

// ==========================================
// API HELPER
// ==========================================
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// Show Toast Notification
function showToast(message, type = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Safe HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Relative time format
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ==========================================
// AUTH & INITIALIZATION
// ==========================================
async function initApp() {
  setupEventListeners();

  if (authToken) {
    try {
      const res = await apiRequest('/api/auth/me');
      currentUser = res.user;
    } catch (err) {
      console.warn('Existing session invalid, switching to default demo user.');
      await quickSwitchUser('alice');
    }
  } else {
    // Default to Alice on first load for instant rich demo
    await quickSwitchUser('alice');
  }

  updateNavAuth();
  updateSidebarUser();
  loadFeed();
  loadSuggestedUsers();
}

// Quick switch between demo accounts
async function quickSwitchUser(username) {
  try {
    const res = await apiRequest('/api/auth/quick-login', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    authToken = res.token;
    currentUser = res.user;
    localStorage.setItem('pulse_token', authToken);

    updateNavAuth();
    updateSidebarUser();
    updateQuickSwitcherUI(username);

    // Refresh current active view
    if (currentView === 'feed') {
      loadFeed();
    } else if (currentView === 'explore') {
      loadExplore();
    } else if (currentView === 'profile') {
      loadProfile(viewingProfileUsername || currentUser.username);
    }
    loadSuggestedUsers();
    showToast(`Switched user to ${currentUser.full_name}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateQuickSwitcherUI(activeUsername) {
  document.querySelectorAll('#quickSwitcher .btn-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.user.toLowerCase() === activeUsername.toLowerCase());
  });
}

function updateNavAuth() {
  if (currentUser) {
    navAuthArea.innerHTML = `
      <div class="nav-user-badge" id="navUserBadge" title="View my profile">
        <img class="avatar avatar-xs" src="${escapeHtml(currentUser.avatar_url)}" alt="${escapeHtml(currentUser.username)}">
        <span class="nav-user-name">${escapeHtml(currentUser.full_name)}</span>
      </div>
      <button type="button" class="btn btn-outline btn-sm" id="logoutBtn">Log out</button>
    `;

    document.getElementById('navUserBadge').addEventListener('click', () => {
      openProfile(currentUser.username);
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      currentUser = null;
      authToken = null;
      localStorage.removeItem('pulse_token');
      updateNavAuth();
      updateSidebarUser();
      loadFeed();
      loadSuggestedUsers();
      showToast('Logged out');
    });

    if (createPostAvatar) {
      createPostAvatar.src = currentUser.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + currentUser.username;
    }
  } else {
    navAuthArea.innerHTML = `
      <button type="button" class="btn btn-outline btn-sm" id="openLoginBtn">Sign In</button>
      <button type="button" class="btn btn-primary btn-sm" id="openRegisterBtn">Sign Up</button>
    `;

    document.getElementById('openLoginBtn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('openRegisterBtn').addEventListener('click', () => openAuthModal('register'));
  }
}

function updateSidebarUser() {
  if (!sidebarUserCard) return;

  if (currentUser) {
    sidebarUserCard.style.display = 'flex';
    sidebarUserCard.innerHTML = `
      <div class="current-user-mini-header" style="cursor: pointer;" id="sidebarProfileLink">
        <img class="avatar avatar-md" src="${escapeHtml(currentUser.avatar_url)}" alt="${escapeHtml(currentUser.username)}">
        <div class="current-user-mini-names">
          <div class="name">${escapeHtml(currentUser.full_name)}</div>
          <div class="handle">@${escapeHtml(currentUser.username)}</div>
        </div>
      </div>
      <div class="current-user-mini-stats" id="sidebarMiniStats">
        <div><strong>Bio</strong> ${escapeHtml(currentUser.bio || 'Building things')}</div>
      </div>
    `;

    document.getElementById('sidebarProfileLink').addEventListener('click', () => {
      openProfile(currentUser.username);
    });
  } else {
    sidebarUserCard.style.display = 'none';
  }
}

// ==========================================
// NAVIGATION & VIEW SWITCHING
// ==========================================
function switchView(viewName) {
  currentView = viewName;

  [navFeedBtn, navExploreBtn, navProfileBtn].forEach(btn => btn.classList.remove('active'));
  [feedSection, exploreSection, profileSection].forEach(sec => sec.classList.remove('active'));

  if (viewName === 'feed') {
    navFeedBtn.classList.add('active');
    feedSection.classList.add('active');
    loadFeed();
  } else if (viewName === 'explore') {
    navExploreBtn.classList.add('active');
    exploreSection.classList.add('active');
    loadExplore();
  } else if (viewName === 'profile') {
    navProfileBtn.classList.add('active');
    profileSection.classList.add('active');
    loadProfile(viewingProfileUsername || (currentUser ? currentUser.username : 'alice'));
  }
}

function openProfile(username) {
  viewingProfileUsername = username;
  switchView('profile');
}

// ==========================================
// FEED & POSTS
// ==========================================
async function loadFeed() {
  postsContainer.innerHTML = '<div class="loading-spinner">Loading feed...</div>';

  try {
    let url = '/api/posts';
    if (feedFilter === 'my' && currentUser) {
      url += `?userId=${currentUser.id}`;
    }

    const res = await apiRequest(url);
    renderPosts(res.posts, postsContainer);
  } catch (err) {
    postsContainer.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderPosts(posts, targetContainer) {
  if (!posts || posts.length === 0) {
    targetContainer.innerHTML = `
      <div class="empty-state">
        <div class="icon">💬</div>
        <h3>No posts yet</h3>
        <p>Be the first to share an update with the community!</p>
      </div>
    `;
    return;
  }

  targetContainer.innerHTML = posts.map(post => {
    const isOwner = currentUser && post.author_id === currentUser.id;
    const likedClass = post.is_liked ? 'liked' : '';
    const heartSymbol = post.is_liked ? '❤️' : '🤍';

    return `
      <article class="post-card" id="post-${post.id}">
        <header class="post-header">
          <div class="post-author-info" onclick="openProfile('${escapeHtml(post.author_username)}')">
            <img class="avatar avatar-md" src="${escapeHtml(post.author_avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + post.author_username)}" alt="${escapeHtml(post.author_name)}">
            <div class="post-author-meta">
              <span class="post-author-name">${escapeHtml(post.author_name)}</span>
              <span class="post-author-handle">@${escapeHtml(post.author_username)}</span>
            </div>
          </div>
          <span class="post-time">${formatRelativeTime(post.created_at)}</span>
        </header>

        <div class="post-content">${escapeHtml(post.content)}</div>

        ${post.image_url ? `
          <div class="post-image-container">
            <img src="${escapeHtml(post.image_url)}" alt="Post media" loading="lazy" onerror="this.parentElement.style.display='none'">
          </div>
        ` : ''}

        <div class="post-actions-bar">
          <button type="button" class="btn-post-action like-btn ${likedClass}" onclick="handleLikePost(${post.id}, this)">
            <span class="heart-icon">${heartSymbol}</span>
            <span class="like-count">${post.likes_count}</span>
          </button>

          <button type="button" class="btn-post-action comment-btn" onclick="toggleCommentsDrawer(${post.id})">
            <span>💬</span>
            <span class="comment-count">${post.comments_count}</span>
          </button>

          ${isOwner ? `
            <button type="button" class="btn-post-action delete-btn" onclick="handleDeletePost(${post.id})" title="Delete post">
              <span>🗑️</span>
            </button>
          ` : ''}
        </div>

        <!-- Comments Drawer -->
        <div class="comments-drawer" id="comments-drawer-${post.id}">
          <div class="comments-list" id="comments-list-${post.id}">
            <!-- Loaded on drawer open -->
          </div>
          <form class="comment-input-row" onsubmit="handleCommentSubmit(event, ${post.id})">
            <input type="text" placeholder="Write a thoughtful comment..." id="comment-input-${post.id}" required>
            <button type="submit" class="btn btn-primary btn-sm">Reply</button>
          </form>
        </div>
      </article>
    `;
  }).join('');
}

// Create New Post
async function handleCreatePost() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  const content = postContentInput.value.trim();
  const imageUrl = postImageUrlInput.value.trim();

  if (!content) {
    showToast('Please type something to post', 'error');
    return;
  }

  submitPostBtn.disabled = true;
  submitPostBtn.textContent = 'Publishing...';

  try {
    await apiRequest('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        content,
        image_url: imageUrl
      })
    });

    postContentInput.value = '';
    postImageUrlInput.value = '';
    postImageField.style.display = 'none';
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';

    showToast('Post published successfully!', 'success');
    loadFeed();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = 'Publish Post';
  }
}

// Delete Post
async function handleDeletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    await apiRequest(`/api/posts/${postId}`, { method: 'DELETE' });
    showToast('Post deleted', 'default');
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) postEl.remove();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Like / Unlike Post
async function handleLikePost(postId, buttonEl) {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  try {
    const res = await apiRequest(`/api/posts/${postId}/like`, { method: 'POST' });
    const countEl = buttonEl.querySelector('.like-count');
    const heartEl = buttonEl.querySelector('.heart-icon');

    countEl.textContent = res.likes_count;
    if (res.liked) {
      buttonEl.classList.add('liked');
      heartEl.textContent = '❤️';
    } else {
      buttonEl.classList.remove('liked');
      heartEl.textContent = '🤍';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Comments Drawer Toggle
async function toggleCommentsDrawer(postId) {
  const drawer = document.getElementById(`comments-drawer-${postId}`);
  const list = document.getElementById(`comments-list-${postId}`);

  if (drawer.classList.contains('open')) {
    drawer.classList.remove('open');
    return;
  }

  drawer.classList.add('open');
  list.innerHTML = '<div class="loading-spinner" style="padding: 0.5rem;">Loading comments...</div>';

  try {
    const res = await apiRequest(`/api/posts/${postId}/comments`);
    renderComments(res.comments, list);
  } catch (err) {
    list.innerHTML = `<div class="empty-state" style="padding: 0.5rem;"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderComments(comments, container) {
  if (!comments || comments.length === 0) {
    container.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-light); text-align: center; padding: 0.5rem;">No comments yet. Start the conversation!</p>';
    return;
  }

  container.innerHTML = comments.map(comment => `
    <div class="comment-item">
      <img class="avatar avatar-xs" src="${escapeHtml(comment.author_avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + comment.author_username)}" alt="${escapeHtml(comment.author_name)}">
      <div class="comment-item-body">
        <div class="comment-item-header">
          <span class="comment-author-name" onclick="openProfile('${escapeHtml(comment.author_username)}')">${escapeHtml(comment.author_name)}</span>
          <span class="comment-time">${formatRelativeTime(comment.created_at)}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.content)}</div>
      </div>
    </div>
  `).join('');
}

// Add Comment
async function handleCommentSubmit(event, postId) {
  event.preventDefault();

  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  const inputEl = document.getElementById(`comment-input-${postId}`);
  const content = inputEl.value.trim();
  if (!content) return;

  try {
    const res = await apiRequest(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    inputEl.value = '';
    const list = document.getElementById(`comments-list-${postId}`);
    
    // Refresh comments list
    const commentsRes = await apiRequest(`/api/posts/${postId}/comments`);
    renderComments(commentsRes.comments, list);

    // Update comment counter in post card
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) {
      const commentCountEl = postEl.querySelector('.comment-count');
      if (commentCountEl) {
        commentCountEl.textContent = parseInt(commentCountEl.textContent || '0', 10) + 1;
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// EXPLORE PEOPLE
// ==========================================
async function loadExplore() {
  exploreContainer.innerHTML = '<div class="loading-spinner">Discovering users...</div>';

  try {
    const res = await apiRequest('/api/users');
    renderExploreUsers(res.users);
  } catch (err) {
    exploreContainer.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderExploreUsers(users) {
  if (!users || users.length === 0) {
    exploreContainer.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
    return;
  }

  exploreContainer.innerHTML = users.map(u => {
    const isSelf = currentUser && currentUser.id === u.id;
    const followingClass = u.is_following ? 'following' : '';
    const buttonText = u.is_following ? '<span>Following</span>' : 'Follow';

    return `
      <div class="user-card">
        <div class="user-card-header">
          <img class="avatar avatar-md" src="${escapeHtml(u.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + u.username)}" alt="${escapeHtml(u.full_name)}">
          <div class="user-card-names">
            <div class="user-card-name" onclick="openProfile('${escapeHtml(u.username)}')">${escapeHtml(u.full_name)}</div>
            <div class="user-card-handle">@${escapeHtml(u.username)}</div>
          </div>
        </div>

        <div class="user-card-bio">${escapeHtml(u.bio || 'Pulse community member')}</div>

        <div class="user-card-footer">
          <span><strong>${u.followers_count}</strong> followers</span>
          ${isSelf ? `
            <button class="btn btn-outline btn-sm" onclick="openEditProfileModal()">Edit</button>
          ` : `
            <button class="btn-follow ${followingClass}" onclick="handleFollowToggle(${u.id}, this)">${buttonText}</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Suggested users widget in right sidebar
async function loadSuggestedUsers() {
  if (!suggestedUsersContainer) return;

  try {
    const res = await apiRequest('/api/users');
    const filtered = (res.users || []).filter(u => !currentUser || u.id !== currentUser.id).slice(0, 4);

    if (filtered.length === 0) {
      suggestedUsersContainer.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-light);">No suggestions</p>';
      return;
    }

    suggestedUsersContainer.innerHTML = filtered.map(u => {
      const followingClass = u.is_following ? 'following' : '';
      const buttonText = u.is_following ? '<span>Following</span>' : 'Follow';

      return `
        <div class="suggested-user-row">
          <div class="suggested-user-info" onclick="openProfile('${escapeHtml(u.username)}')">
            <img class="avatar avatar-sm" src="${escapeHtml(u.avatar_url)}" alt="${escapeHtml(u.full_name)}">
            <div class="suggested-user-details">
              <div class="suggested-name">${escapeHtml(u.full_name)}</div>
              <div class="suggested-handle">@${escapeHtml(u.username)}</div>
            </div>
          </div>
          <button class="btn-follow btn-sm ${followingClass}" onclick="handleFollowToggle(${u.id}, this)">
            ${buttonText}
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load suggestions:', err);
  }
}

// Follow / Unfollow Toggle
async function handleFollowToggle(targetUserId, buttonEl) {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  try {
    const res = await apiRequest(`/api/users/${targetUserId}/follow`, { method: 'POST' });
    showToast(res.message, 'success');

    if (res.following) {
      buttonEl.classList.add('following');
      buttonEl.innerHTML = '<span>Following</span>';
    } else {
      buttonEl.classList.remove('following');
      buttonEl.innerHTML = 'Follow';
    }

    // If profile view is currently active for this user, refresh stats
    if (currentView === 'profile' && viewingProfileUsername) {
      loadProfile(viewingProfileUsername);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// PROFILE VIEW
// ==========================================
async function loadProfile(username) {
  viewingProfileUsername = username;
  profileHeaderCard.innerHTML = '<div class="loading-spinner">Loading profile...</div>';
  profilePostsContainer.innerHTML = '<div class="loading-spinner">Loading posts...</div>';

  try {
    const res = await apiRequest(`/api/users/${username}`);
    const profile = res.profile;

    const isSelf = currentUser && currentUser.id === profile.id;
    const followingClass = profile.is_following ? 'following' : '';
    const followBtnText = profile.is_following ? '<span>Following</span>' : 'Follow';

    profileHeaderCard.innerHTML = `
      <div class="profile-cover-placeholder"></div>
      <div class="profile-top-row">
        <div class="profile-avatar-wrapper">
          <img class="avatar avatar-lg" src="${escapeHtml(profile.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + profile.username)}" alt="${escapeHtml(profile.full_name)}">
        </div>
        <div class="profile-actions">
          ${isSelf ? `
            <button type="button" class="btn btn-outline" onclick="openEditProfileModal()">Edit Profile</button>
          ` : `
            <button type="button" class="btn-follow ${followingClass}" onclick="handleFollowToggle(${profile.id}, this)">
              ${followBtnText}
            </button>
          `}
        </div>
      </div>

      <div class="profile-info">
        <h2 class="profile-name">${escapeHtml(profile.full_name)}</h2>
        <div class="profile-handle">@${escapeHtml(profile.username)}</div>
        <p class="profile-bio">${escapeHtml(profile.bio || 'No bio provided yet.')}</p>

        <div class="profile-stats-row">
          <div class="profile-stat-item">
            <strong>${profile.posts_count}</strong> posts
          </div>
          <div class="profile-stat-item" id="profileFollowersCount">
            <strong>${profile.followers_count}</strong> followers
          </div>
          <div class="profile-stat-item">
            <strong>${profile.following_count}</strong> following
          </div>
        </div>
      </div>
    `;

    profilePostsTitle.textContent = `${profile.full_name}'s Posts`;

    // Load user's posts
    const postsRes = await apiRequest(`/api/posts?userId=${profile.id}`);
    renderPosts(postsRes.posts, profilePostsContainer);
  } catch (err) {
    profileHeaderCard.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

// Edit Profile Modal
function openEditProfileModal() {
  if (!currentUser) return;
  editFullName.value = currentUser.full_name || '';
  editBio.value = currentUser.bio || '';
  editAvatarUrl.value = currentUser.avatar_url || '';
  editProfileModal.classList.add('open');
}

async function handleEditProfileSubmit(event) {
  event.preventDefault();

  const fullName = editFullName.value.trim();
  const bio = editBio.value.trim();
  const avatarUrl = editAvatarUrl.value.trim();

  try {
    const res = await apiRequest('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({
        full_name: fullName,
        bio,
        avatar_url: avatarUrl
      })
    });

    currentUser = res.user;
    updateNavAuth();
    updateSidebarUser();
    editProfileModal.classList.remove('open');
    showToast('Profile updated!', 'success');

    if (currentView === 'profile') {
      loadProfile(currentUser.username);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// AUTH MODAL & FORM HANDLERS
// ==========================================
function openAuthModal(mode = 'login') {
  authModal.classList.add('open');
  if (mode === 'login') {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    authModalTitle.textContent = 'Welcome Back';
  } else {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.style.display = 'flex';
    loginForm.style.display = 'none';
    authModalTitle.textContent = 'Create an Account';
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameOrEmail = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password })
    });

    authToken = res.token;
    currentUser = res.user;
    localStorage.setItem('pulse_token', authToken);

    authModal.classList.remove('open');
    updateNavAuth();
    updateSidebarUser();
    loadFeed();
    loadSuggestedUsers();
    showToast(`Welcome, ${currentUser.full_name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const fullName = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const bio = document.getElementById('regBio').value.trim();

  try {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        full_name: fullName,
        email,
        password,
        bio
      })
    });

    authToken = res.token;
    currentUser = res.user;
    localStorage.setItem('pulse_token', authToken);

    authModal.classList.remove('open');
    updateNavAuth();
    updateSidebarUser();
    loadFeed();
    loadSuggestedUsers();
    showToast('Account created successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
  // Navigation
  navFeedBtn.addEventListener('click', () => switchView('feed'));
  navExploreBtn.addEventListener('click', () => switchView('explore'));
  navProfileBtn.addEventListener('click', () => {
    if (currentUser) {
      openProfile(currentUser.username);
    } else {
      openAuthModal('login');
    }
  });
  logoBtn.addEventListener('click', () => switchView('feed'));

  // Quick Switcher Buttons
  document.querySelectorAll('#quickSwitcher .btn-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      quickSwitchUser(btn.dataset.user);
    });
  });

  // Post Creator UI
  toggleImageBtn.addEventListener('click', () => {
    const isOpen = postImageField.style.display !== 'none';
    postImageField.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) postImageUrlInput.focus();
  });

  postImageUrlInput.addEventListener('input', () => {
    const url = postImageUrlInput.value.trim();
    if (url) {
      imagePreview.src = url;
      imagePreviewContainer.style.display = 'flex';
    } else {
      imagePreviewContainer.style.display = 'none';
    }
  });

  removeImageBtn.addEventListener('click', () => {
    postImageUrlInput.value = '';
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';
  });

  submitPostBtn.addEventListener('click', handleCreatePost);

  // Feed Filter Tabs
  document.querySelectorAll('.feed-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.feed-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      feedFilter = btn.dataset.filter;
      loadFeed();
    });
  });

  // Modals Close Handlers
  closeAuthModal.addEventListener('click', () => authModal.classList.remove('open'));
  closeEditProfileModal.addEventListener('click', () => editProfileModal.classList.remove('open'));

  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.classList.remove('open');
  });

  editProfileModal.addEventListener('click', (e) => {
    if (e.target === editProfileModal) editProfileModal.classList.remove('open');
  });

  // Auth Tabs
  tabLoginBtn.addEventListener('click', () => openAuthModal('login'));
  tabRegisterBtn.addEventListener('click', () => openAuthModal('register'));

  // Form Submissions
  loginForm.addEventListener('submit', handleLoginSubmit);
  registerForm.addEventListener('submit', handleRegisterSubmit);
  editProfileForm.addEventListener('submit', handleEditProfileSubmit);
}

// Global expose for inline onclick attributes
window.openProfile = openProfile;
window.handleLikePost = handleLikePost;
window.handleDeletePost = handleDeletePost;
window.toggleCommentsDrawer = toggleCommentsDrawer;
window.handleCommentSubmit = handleCommentSubmit;
window.handleFollowToggle = handleFollowToggle;
window.openEditProfileModal = openEditProfileModal;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initApp);
