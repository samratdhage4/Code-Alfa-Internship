# Task 2: Mini Social Media Platform (Pulse)

A clean, modern, and lightweight mini social media web application built with **Node.js, Express.js, built-in SQLite (`node:sqlite`), HTML, CSS, and Vanilla JavaScript**.

---

## 🌟 Features

- **User Profiles**: View full profiles, bios, avatar images, join date, posts, follower counts, following counts, and edit own profile details.
- **Posts & Media**: Share text thoughts and optional image URLs with live image previews and feed filters.
- **Comments System**: Expandable comment drawer under each post to participate in conversations in real time.
- **Likes System**: Interactive like/unlike with live heart animation and count update.
- **Follow System**: Follow and unfollow users across feeds, suggested widgets, and profile cards.
- **Instant Demo Switcher**: One-click demo account switcher in the top navigation bar between seeded demo users (`Alice`, `Bob`, `Charlie`) to easily test and demonstrate multi-user social interactions (following, liking, commenting) without needing multiple browsers.
- **Built-in Database**: Powered by Node 22+ built-in `node:sqlite` (SQLite3) with relational foreign keys and automatic data seeding.

---

## 📁 Project Structure

```
task2/
├── package.json          # Express, CORS, bcryptjs, jsonwebtoken
├── server.js            # REST API (Auth, Users, Posts, Comments, Likes, Follows)
├── db.js                # SQLite schema, queries, and seed data
├── social.db            # Auto-generated SQLite database
├── public/
│   ├── index.html       # Single-page social media layout
│   ├── css/
│   │   └── style.css    # Clean modern responsive stylesheet
│   └── js/
│       └── app.js       # Client application logic & REST API integration
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd task2
npm install
```

### 2. Start the Server
```bash
npm start
# or for development auto-reloading:
npm run dev
```

### 3. Open in Browser
Visit: **`http://localhost:4000`**

---

## 👥 Demo Accounts

The database comes pre-seeded with 3 active demo users. You can switch between them with one click using the header buttons:
- **Alice Johnson** (`username: alice`, `password: password123`)
- **Bob Smith** (`username: bob`, `password: password123`)
- **Charlie Davis** (`username: charlie`, `password: password123`)

Or click **Sign Up** to create your own custom user account!
