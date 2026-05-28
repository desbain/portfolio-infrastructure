const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) { console.error('DB connection error:', err.message); }
  else { console.log('Connected to PostgreSQL RDS'); release(); }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY project_num');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/visitors/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM visitors');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visitor count' });
  }
});

app.post('/api/visitors', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await pool.query(
      'INSERT INTO visitors (ip_address, user_agent) VALUES ($1, $2)',
      [ip, userAgent]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record visitor' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields required' });
    }
    await pool.query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );
    res.json({ success: true, message: 'Message received!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts ORDER BY submitted_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

app.listen(PORT, () => {
  console.log('Portfolio API running on port ' + PORT);
});
