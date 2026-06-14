// src/routes/message.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { postMessageSchema } from '../validators/message.validator.js';
import { getMessages, postMessage, deleteMessage } from '../controllers/message.controller.js';

const router = Router();
router.use(authenticate);

// All messages for an expense
router.get('/expense/:expenseId',    getMessages);
// Post a new message
router.post('/expense/:expenseId',   validate(postMessageSchema), postMessage);
// Delete own message
router.delete('/:id',                deleteMessage);

export default router;