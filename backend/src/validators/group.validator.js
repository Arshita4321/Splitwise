// src/validators/group.validator.js
import { z } from 'zod';

export const createGroupSchema = z.object({
  name:     z.string().min(1).max(100),
  currency: z.string().max(10).default('INR'),
});

export const updateGroupSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  currency: z.string().max(10).optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
});

export const addMemberSchema = z.object({
  user_id: z.number().int().positive(),
});

export const respondInviteSchema = z.object({
  action: z.enum(['accept', 'decline']),
});