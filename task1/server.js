const express = require('express');
const cors = require('cors');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_ecommerce_super_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Optional Auth Middleware (attaches user if valid token exists)
function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

// ===================== AUTH ROUTES =====================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `).run(name.trim(), normalizedEmail, password_hash);

    const userId = Number(result.lastInsertRowid);
    const user = { id: userId, name: name.trim(), email: normalizedEmail };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!userRow) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = bcrypt.compareSync(password, userRow.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = { id: userRow.id, name: userRow.name, email: userRow.email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Logged in successfully',
      user,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const userRow = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!userRow) return res.status(404).json({ error: 'User not found' });
  res.json({ user: userRow });
});

// ===================== PRODUCT ROUTES =====================

// Get products with optional category, search, sorting
app.get('/api/products', (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim() !== '') {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (sort === 'price-asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price-desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'rating') {
      query += ' ORDER BY rating DESC';
    } else {
      query += ' ORDER BY id DESC';
    }

    const products = db.prepare(query).all(...params);
    res.json({ products });
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product categories
app.get('/api/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT category FROM products ORDER BY category ASC').all();
    const categories = ['All', ...rows.map(r => r.category)];
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single product details
app.get('/api/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// ===================== ORDER ROUTES =====================

// Create Order (Checkout)
app.post('/api/orders', optionalToken, (req, res) => {
  try {
    const { customer_name, customer_email, shipping_address, items } = req.body;

    if (!customer_name || !customer_email || !shipping_address) {
      return res.status(400).json({ error: 'Name, email, and shipping address are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // Validate items and calculate total from actual database prices
    let calculatedTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!prod) {
        return res.status(400).json({ error: `Product ID ${item.product_id} no longer exists` });
      }
      const qty = parseInt(item.quantity, 10) || 1;
      if (qty <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }
      if (prod.stock < qty) {
        return res.status(400).json({ error: `Insufficient stock for "${prod.title}". Only ${prod.stock} left.` });
      }

      calculatedTotal += prod.price * qty;
      verifiedItems.push({
        product_id: prod.id,
        title: prod.title,
        unit_price: prod.price,
        quantity: qty
      });
    }

    // Insert Order
    const userId = req.user ? req.user.id : null;
    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, customer_name, customer_email, shipping_address, total_amount, status)
      VALUES (?, ?, ?, ?, ?, 'Confirmed')
    `).run(userId, customer_name.trim(), customer_email.trim(), shipping_address.trim(), calculatedTotal);

    const orderId = Number(orderResult.lastInsertRowid);

    // Insert Order Items & decrement stock
    const insertItemStmt = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_title, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE products SET stock = stock - ? WHERE id = ?
    `);

    for (const it of verifiedItems) {
      insertItemStmt.run(orderId, it.product_id, it.title, it.quantity, it.unit_price);
      updateStockStmt.run(it.quantity, it.product_id);
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      totalAmount: calculatedTotal,
      itemsCount: verifiedItems.reduce((acc, cur) => acc + cur.quantity, 0),
      status: 'Confirmed'
    });
  } catch (err) {
    console.error('Order processing error:', err);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// Get user orders or query by email
app.get('/api/orders', optionalToken, (req, res) => {
  try {
    let orders = [];
    if (req.user) {
      orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    } else if (req.query.email) {
      orders = db.prepare('SELECT * FROM orders WHERE customer_email = ? ORDER BY id DESC').all(req.query.email.trim());
    } else {
      return res.status(400).json({ error: 'Must be logged in or supply an email to view orders' });
    }

    // Attach items to each order
    const enrichedOrders = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      return { ...order, items };
    });

    res.json({ orders: enrichedOrders });
  } catch (err) {
    console.error('Orders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Fallback route to index.html for SPA feel
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`E-Commerce Store Server is running at http://localhost:${PORT}`);
});
