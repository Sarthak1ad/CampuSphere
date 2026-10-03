/**
 * AUTH MIDDLEWARE
 * ---------------
 * JWT-based authentication + RBAC (Role-Based Access Control)
 * Two middlewares exported:
 *  1. protect   — verifies JWT and attaches user to req.user
 *  2. authorize — checks if user's role is in the allowed roles list
 */
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

// ── PROTECT MIDDLEWARE ────────────────────────────────────────────────────────
// Extracts JWT from Authorization header, verifies it, and loads the user.
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from "Bearer <token>" header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('No authentication token provided');
  }

  // Verify JWT signature and expiry
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // If invalid: throws JsonWebTokenError → caught by error handler
  // If expired: throws TokenExpiredError → caught by error handler

  // Load the full user from database
  // Note: We use .select('+passwordHash') to EXCLUDE it (since select:false in schema)
  const user = await User.findById(decoded.id).select('-passwordHash');

  if (!user) {
    throw ApiError.unauthorized('User account not found or was deleted');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Contact support.');
  }

  // Attach user to request — available in all subsequent middleware/controllers
  req.user = user;
  next();
});

// ── AUTHORIZE MIDDLEWARE ──────────────────────────────────────────────────────
// Factory function: returns middleware that checks allowed roles.
// Usage: router.delete('/:id', protect, authorize('admin'), deleteUser)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. This action requires one of these roles: ${roles.join(', ')}`
      );
    }
    next();
  };
};

// ── OPTIONAL AUTH ─────────────────────────────────────────────────────────────
// Like protect, but doesn't error if no token — just sets req.user = null
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    req.user = user?.isActive ? user : null;
  } catch {
    req.user = null;
  }
  next();
});

module.exports = { protect, authorize, optionalAuth };
