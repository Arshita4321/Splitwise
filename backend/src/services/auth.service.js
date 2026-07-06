import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const SALT_ROUNDS = 10;

/**
 * Generates a signed JWT containing the user's id and email.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '1d' }
  );
};

/**
 * Registers a new user.
 * - Ensures email is unique
 * - Hashes the password (never store plaintext)
 * - Returns the created user (without password_hash) + a JWT
 */
export const registerUser = async ({ name, email, password }) => {
  const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);

  if (existing.rows.length > 0) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );

  const user = result.rows[0];
  const token = generateToken(user);

  return { user, token };
};

/**
 * Authenticates a user by email + password.
 * - Looks up user by email
 * - Compares password against stored hash
 * - Returns user (without password_hash) + a JWT
 *
 * Note: returns the same generic error for "user not found" and
 * "wrong password" to avoid leaking which emails are registered.
 */
export const loginUser = async ({ email, password }) => {
  const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  const user = result.rows[0];

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    token,
  };
};

/**
 * Fetches the currently authenticated user's profile (used by GET /me).
 */
export const getUserById = async (userId) => {
  const result = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  return result.rows[0];
};
