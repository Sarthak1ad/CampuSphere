/**
 * ASYNC HANDLER WRAPPER
 * ---------------------
 * Wraps async route handlers to catch errors and pass them to
 * Express's next() — eliminating try/catch boilerplate in every controller.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
