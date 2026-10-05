/**
 * CENTRAL ERROR HANDLER MIDDLEWARE
 * --------------------------------
 * Express calls this when any middleware calls next(err) or an async handler throws.
 * We handle specific MongoDB/Mongoose error types with user-friendly messages.
 *
 * MongoDB-specific errors we handle:
 *  - MongoServerError 11000: Duplicate key (unique index violation)
 *  - CastError: Invalid ObjectId format (e.g., "abc" instead of valid ObjectId)
 *  - ValidationError: Mongoose schema validation failed
 */
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // ── MongoDB Duplicate Key Error ────────────────────────────────────────────
  // MongoDB Concept: When a unique index is violated, MongoDB throws
  // MongoServerError with code 11000 (or 11001 for bulk ops).
  // We parse the field name from the error keyPattern and give a friendly message.
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists. Please use a different value.`;
    statusCode = 409; // 409 Conflict
    errors = [{ field, message }];
  }

  // ── Mongoose CastError ─────────────────────────────────────────────────────
  // MongoDB Concept: ObjectIds must be 24-character hex strings.
  // If someone passes "abc" as an event ID, Mongoose throws CastError.
  else if (err.name === 'CastError') {
    message = `Invalid value '${err.value}' for field '${err.path}'`;
    statusCode = 400;
    errors = [{ field: err.path, message }];
  }

  // ── Mongoose ValidationError ───────────────────────────────────────────────
  // MongoDB Concept: Mongoose runs schema validators before every save().
  // If any validator fails, Mongoose throws ValidationError with details
  // about WHICH field failed and WHY.
  else if (err.name === 'ValidationError') {
    const errorDetails = Object.values(err.errors).map((e) => e.message).join(', ');
    message = errorDetails ? `Validation failed: ${errorDetails}` : 'Validation failed';
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ── JWT Errors ─────────────────────────────────────────────────────────────
  else if (err.name === 'JsonWebTokenError') {
    message = 'Invalid authentication token';
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    message = 'Authentication token has expired. Please login again.';
    statusCode = 401;
  }

  // ── Operational vs Programming Errors ─────────────────────────────────────
  // Operational errors (ApiError) are expected (bad input, not found, etc.)
  // Programming errors (bugs) should not leak details in production
  if (!err.isOperational && process.env.NODE_ENV === 'production') {
    console.error('🔴 PROGRAMMING ERROR:', err);
    message = 'Something went wrong. Please try again later.';
    statusCode = 500;
    errors = [];
  }

  // Log all errors in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`❌ [${new Date().toISOString()}] ${statusCode} ${req.method} ${req.path}:`, err.message);
  }

  // ── Consistent Error Response Format ──────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
