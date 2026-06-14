// src/validators/balance.validator.js
import { z } from 'zod';

export const recordPaymentSchema = z.object({
  group_id: z.number().int().positive(),
  paid_to:  z.number().int().positive(),
  amount:   z.number().positive(),
  note:     z.string().max(255).optional(),
});