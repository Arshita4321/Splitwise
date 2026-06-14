/**
 * Custom error class for predictable, operational errors
 * (e.g. validation failures, not found, unauthorized).
 * Thrown in services/controllers and caught by error.middleware.js
 */
export class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.success = false;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
