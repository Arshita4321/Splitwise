// src/routes/balance.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { recordPaymentSchema } from '../validators/balance.validator.js';
import {
  getGroupBalances, getMyBalances, recordPayment, getGroupPayments,
} from '../controllers/balance.controller.js';

const router = Router();
router.use(authenticate);

// Individual summary across all groups
router.get('/me',                     getMyBalances);

// Group-specific balances
router.get('/group/:groupId',         getGroupBalances);
router.get('/group/:groupId/payments', getGroupPayments);

// Record a settlement
router.post('/settle',                validate(recordPaymentSchema), recordPayment);

export default router;