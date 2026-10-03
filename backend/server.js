/**
 * COLLEGE EVENT MANAGEMENT SYSTEM — Backend Server
 * =================================================
 * Entry point for the Express API server.
 *
 * Security middleware used:
 *  - helmet: Sets secure HTTP headers
 *  - cors: Restricts origins to Angular frontend
 *  - express-rate-limit: Prevents brute-force attacks
 *  - express-mongo-sanitize: Prevents NoSQL injection ($-operator attacks)
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { startCronJobs } = require('./services/cronService');

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
// helmet: Sets 14+ security headers (X-Content-Type, HSTS, CSP, etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS: Only allow requests from Angular frontend
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// express-mongo-sanitize: Strips MongoDB operators ($, .) from user input
// Prevents injection attacks like: { email: { "$gt": "" } }
app.use(mongoSanitize());

// Rate limiting: 100 requests per 15 minutes per IP (for auth routes: 20/15min)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter limit for auth endpoints
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
});

app.use(globalLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API ROUTES ─────────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authLimiter, require('./routes/auth'));
app.use(`${API}/events`, require('./routes/events'));
app.use(`${API}/registrations`, require('./routes/registrations'));
app.use(`${API}/venues`, require('./routes/venues'));
app.use(`${API}/feedback`, require('./routes/feedback'));
app.use(`${API}/notifications`, require('./routes/notifications'));
app.use(`${API}/analytics`, require('./routes/analytics'));
app.use(`${API}/users`, require('./routes/users'));
app.use(`${API}/db-lab`, require('./routes/dbLab'));

// Platform feedback (student submits)
app.use(`${API}/platform-feedback`, require('./routes/platformFeedback'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Handle 404 for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── CENTRAL ERROR HANDLER ─────────────────────────────────────────────────────
// Must be last middleware — Express identifies it by 4 parameters (err, req, res, next)
app.use(errorHandler);

// ── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`📡 MongoDB URI: ${process.env.MONGO_URI?.substring(0, 30)}...`);

  // Start background cron jobs
  startCronJobs();
});

// ── GRACEFUL SHUTDOWN ─────────────────────────────────────────────────────────
// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    require('mongoose').disconnect();
    process.exit(0);
  });
});

module.exports = app;
