const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      stock INTEGER DEFAULT 20,
      rating REAL DEFAULT 4.5
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'Completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_title TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  // Seed default demo user if not exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@codealpha.com');
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password123', salt);
    db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `).run('Demo User', 'demo@codealpha.com', hash);
  }

  // Seed initial products if catalog is empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (countRow.count === 0) {
    const initialProducts = [
      {
        title: 'Sony WH-1000XM5 Wireless Headphones',
        description: 'Industry-leading noise canceling with two processors and 8 microphones. Magnificent sound engineered to perfection with Ultra-clear hands-free calling.',
        price: 349.99,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        stock: 15,
        rating: 4.8
      },
      {
        title: 'Apple Watch Series 9 GPS',
        description: 'Powerful health sensors, advanced safety features, and brighter display. Double tap gesture delivers an intuitive way to interact with Apple Watch.',
        price: 399.00,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        stock: 22,
        rating: 4.9
      },
      {
        title: 'Fujifilm X-T30 II Mirrorless Camera',
        description: 'Compact and lightweight mirrorless digital camera featuring 26.1MP X-Trans CMOS 4 sensor and high-speed image processing engine.',
        price: 899.50,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
        stock: 8,
        rating: 4.7
      },
      {
        title: 'Minimalist Leather Weekend Duffel',
        description: 'Handcrafted full-grain leather travel bag with waterproof lining, sturdy brass hardware, and dedicated shoe compartment.',
        price: 185.00,
        category: 'Fashion',
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
        stock: 18,
        rating: 4.6
      },
      {
        title: 'Nike Air Max 270 React Sneakers',
        description: 'Lightweight, layered no-sew materials create a modern aesthetic. Nike React technology delivers an extremely smooth ride.',
        price: 159.99,
        category: 'Fashion',
        image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        stock: 25,
        rating: 4.8
      },
      {
        title: 'Classic Polarized Aviator Sunglasses',
        description: 'Timeless tear-drop style with premium glare-reducing polarized lenses and lightweight stainless steel frame.',
        price: 79.00,
        category: 'Fashion',
        image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
        stock: 30,
        rating: 4.5
      },
      {
        title: 'AeroPress Coffee and Espresso Maker',
        description: 'Patented 3-in-1 brew technology combines the best of several brew methods into one easy to use, highly portable device.',
        price: 49.95,
        category: 'Home & Kitchen',
        image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        stock: 40,
        rating: 4.9
      },
      {
        title: 'Ceramic Pour-Over Kettle & Carafe Set',
        description: 'Matte black gooseneck kettle engineered for optimal pour rate and heat retention, paired with a heat-resistant glass carafe.',
        price: 64.00,
        category: 'Home & Kitchen',
        image_url: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80',
        stock: 14,
        rating: 4.6
      },
      {
        title: 'Smart LED Ambient Desk Light Bar',
        description: 'Adjustable color temperature, dynamic RGB backlighting, auto-dimming ambient sensor, and wireless desktop dial controller.',
        price: 89.99,
        category: 'Home & Kitchen',
        image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80',
        stock: 20,
        rating: 4.7
      },
      {
        title: 'Mechanical Hot-Swap RGB Keyboard',
        description: '75% layout custom wireless mechanical keyboard with pre-lubed Gateron switches, sound dampening foam, and PBT keycaps.',
        price: 129.00,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
        stock: 12,
        rating: 4.8
      },
      {
        title: 'HydroShield Insulated Stainless Steel Bottle (1L)',
        description: 'Double-wall vacuum insulation keeps beverages cold for up to 24 hours or piping hot for 12 hours. BPA-free leak-proof lid.',
        price: 34.50,
        category: 'Home & Kitchen',
        image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
        stock: 50,
        rating: 4.7
      },
      {
        title: 'Vintage Chronograph Leather Watch',
        description: 'Sleek brushed stainless steel case with sapphire crystal glass and genuine Italian calfskin leather strap.',
        price: 210.00,
        category: 'Fashion',
        image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
        stock: 9,
        rating: 4.8
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO products (title, description, price, category, image_url, stock, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of initialProducts) {
      insertStmt.run(p.title, p.description, p.price, p.category, p.image_url, p.stock, p.rating);
    }
  }
}

initDatabase();

module.exports = db;
