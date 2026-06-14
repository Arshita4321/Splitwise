import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { registerUser, loginUser, getUserById } from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await registerUser(req.body);
  res.status(201).json(new ApiResponse(201, { user, token }, 'User registered successfully'));
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await loginUser(req.body);
  res.status(200).json(new ApiResponse(200, { user, token }, 'Login successful'));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  res.status(200).json(new ApiResponse(200, { user }, 'User profile fetched'));
});
