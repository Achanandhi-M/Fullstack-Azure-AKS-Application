require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { BlobServiceClient } = require('@azure/storage-blob');
const bcrypt = require('bcrypt');
const basicAuth = require('basic-auth');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize PostgreSQL Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false } // Required for Azure PostgreSQL
});

// Initialize Azure Blob Storage Client
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING || "DefaultEndpointsProtocol=https;AccountName=x;AccountKey=x;EndpointSuffix=core.windows.net");
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_BLOB_CONTAINER || 'uploads');

// Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Database Initialization (Create tables if they don't exist)
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database initialized.");
  } catch (err) {
    console.error("Failed to initialize database", err);
  }
};
initDB();

// Basic Authentication Middleware
const authMiddleware = async (req, res, next) => {
  const credentials = basicAuth(req);
  if (!credentials) {
    res.setHeader('WWW-Authenticate', 'Basic realm="example"');
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [credentials.name]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(credentials.pass, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// API: Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Login (Just validates auth)
app.get('/api/login', authMiddleware, (req, res) => {
  res.json({ message: 'Login successful', username: req.user.username });
});

// API: Get items
app.get('/api/items', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// API: Create an item
app.post('/api/items', authMiddleware, async (req, res) => {
  const { title, description, image_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(
      'INSERT INTO items (user_id, title, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, title, description, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// API: Upload image to Azure Blob Storage
app.post('/api/upload', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  try {
    const blobName = `${Date.now()}-${req.file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });

    res.json({ image_url: blockBlobClient.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Health check for Kubernetes
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
