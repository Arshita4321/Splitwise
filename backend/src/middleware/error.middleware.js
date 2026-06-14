import { ApiError } from '../utils/ApiError.js';

/**
 * Centralized error handler. Must be registered LAST in app.js
 * (after all routes) so Express recognizes it as an error middleware.
 */
export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
    });
  }

  // Unexpected/programmer errors - log full detail server-side,
  // but never leak internals to the client.
  console.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: 'Internal server error',
  });
};
