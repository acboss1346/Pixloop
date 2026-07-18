import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: ['https://pixloop-nu.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads if not using Cloudinary entirely, but we are using Cloudinary.
// We'll keep this just in case.

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

import pool from './config/db.js';

app.get('/', (req, res) => {
  res.json({ message: 'PixLoop Backend API', status: 'running', endpoints: { health: '/api/health', auth: '/api/auth', posts: '/api/posts', communities: '/api/communities' } });
});

app.get('/api', (req, res) => {
  res.json({ message: 'PixLoop Backend API', status: 'running', endpoints: { health: '/api/health', auth: '/api/auth', posts: '/api/posts', communities: '/api/communities', notifications: '/api/notifications' } });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Server is running and Database is connected!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Server running, but Database connection failed', error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({ message: 'Something went wrong!', error: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
