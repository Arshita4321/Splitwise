// src/routes/import.routes.js
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  importCSV, getImportSessions, getImportReport, resolvePendingRow,
} from '../controllers/import.controller.js';

const router = Router();
router.use(authenticate);

// Keep file in memory (we read it as text, never touch disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Only .csv files are accepted'));
  },
});

router.post('/group/:groupId',            upload.single('csv'), importCSV);
router.get('/group/:groupId/sessions',    getImportSessions);
router.get('/sessions/:sessionId/report', getImportReport);
router.post('/pending/:pendingRowId/resolve', resolvePendingRow);

export default router;