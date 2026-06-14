import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches { id, email } to req.user.
 * All routes except /api/auth/register and /api/auth/login
 * will use this middleware.
 */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authorization token missing'));
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { id, email, iat, exp }
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};
