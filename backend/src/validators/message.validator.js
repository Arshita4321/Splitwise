// src/validators/message.validator.js
import { z } from 'zod';

export const postMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});