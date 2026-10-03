/**
 * CUSTOM API ERROR CLASS
 * ----------------------
 * Extends native Error with HTTP status code.
 * The central error handler checks for this class to send proper HTTP responses.
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Distinguishes our errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, errors = []) { return new ApiError(msg, 400, errors); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(msg, 401); }
  static forbidden(msg = 'Forbidden') { return new ApiError(msg, 403); }
  static notFound(msg = 'Resource not found') { return new ApiError(msg, 404); }
  static conflict(msg) { return new ApiError(msg, 409); }
  static internal(msg = 'Internal server error') { return new ApiError(msg, 500); }
}

module.exports = ApiError;
