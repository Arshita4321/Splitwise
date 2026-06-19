// src/controllers/import.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as importService from '../services/import.service.js';

// POST /api/import/group/:groupId
// Body: multipart/form-data with file field "csv"
export const importCSV = asyncHandler(async (req, res) => {
  if (!req.file) throw Object.assign(new Error('No CSV file uploaded'), { statusCode: 400 });
  const csvText = req.file.buffer.toString('utf-8');
  const groupId = +req.params.groupId;
  const result  = await importService.processImport(csvText, groupId, req.user.id, req.file.originalname);
  res.status(201).json(new ApiResponse(201, result, 'Import complete'));
});

// GET /api/import/group/:groupId/sessions
export const getImportSessions = asyncHandler(async (req, res) => {
  const sessions = await importService.getImportSessions(+req.params.groupId);
  res.json(new ApiResponse(200, sessions));
});

// GET /api/import/sessions/:sessionId/report
export const getImportReport = asyncHandler(async (req, res) => {
  const report = await importService.getImportReport(+req.params.sessionId);
  res.json(new ApiResponse(200, report));
});

// POST /api/import/pending/:pendingRowId/resolve
// Body: { action: 'approve' | 'reject' }
export const resolvePendingRow = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    throw Object.assign(new Error('action must be "approve" or "reject"'), { statusCode: 400 });
  }
  const result = await importService.resolvePendingRow(+req.params.pendingRowId, action);
  res.json(new ApiResponse(200, result, `Row ${action}d`));
});