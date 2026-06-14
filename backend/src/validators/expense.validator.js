// src/validators/expense.validator.js
import { z } from 'zod';

const splitItemUnequal = z.object({
  user_id: z.number().int().positive(),
  amount:  z.number().positive(),
});

const splitItemPercentage = z.object({
  user_id:    z.number().int().positive(),
  percentage: z.number().positive().max(100),
});

const splitItemShares = z.object({
  user_id: z.number().int().positive(),
  shares:  z.number().int().positive(),
});

export const createExpenseSchema = z.discriminatedUnion('split_type', [
  z.object({
    split_type:  z.literal('equal'),
    group_id:    z.number().int().positive(),
    amount:      z.number().positive(),
    description: z.string().min(1).max(255),
    category:    z.string().max(30).optional(),
    paid_by:     z.number().int().positive().optional(),
    // no splits field needed for equal
  }),
  z.object({
    split_type:  z.literal('unequal'),
    group_id:    z.number().int().positive(),
    amount:      z.number().positive(),
    description: z.string().min(1).max(255),
    category:    z.string().max(30).optional(),
    paid_by:     z.number().int().positive().optional(),
    splits:      z.array(splitItemUnequal).min(2),
  }),
  z.object({
    split_type:  z.literal('percentage'),
    group_id:    z.number().int().positive(),
    amount:      z.number().positive(),
    description: z.string().min(1).max(255),
    category:    z.string().max(30).optional(),
    paid_by:     z.number().int().positive().optional(),
    splits:      z.array(splitItemPercentage).min(2),
  }),
  z.object({
    split_type:  z.literal('shares'),
    group_id:    z.number().int().positive(),
    amount:      z.number().positive(),
    description: z.string().min(1).max(255),
    category:    z.string().max(30).optional(),
    paid_by:     z.number().int().positive().optional(),
    splits:      z.array(splitItemShares).min(2),
  }),
]);

export const updateExpenseSchema = z.object({
  amount:      z.number().positive().optional(),
  description: z.string().min(1).max(255).optional(),
  category:    z.string().max(30).optional(),
  split_type:  z.enum(['equal','unequal','percentage','shares']).optional(),
  splits:      z.array(z.object({
    user_id:    z.number().int().positive(),
    amount:     z.number().positive().optional(),
    percentage: z.number().positive().max(100).optional(),
    shares:     z.number().int().positive().optional(),
  })).optional(),
});