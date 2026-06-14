// src/routes/expense.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator.js';
import {
  createExpense, getGroupExpenses, getExpense, updateExpense, deleteExpense,
} from '../controllers/expense.controller.js';

const router = Router();
router.use(authenticate);

router.post('/',                          validate(createExpenseSchema), createExpense);
router.get('/group/:groupId',             getGroupExpenses);
router.get('/:id',                        getExpense);
router.put('/:id',                        validate(updateExpenseSchema), updateExpense);
router.delete('/:id',                     deleteExpense);

export default router;