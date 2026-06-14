// src/controllers/message.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as messageService from '../services/message.service.js';

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await messageService.getMessages(+req.params.expenseId, req.user.id);
  res.json(new ApiResponse(200, messages));
});

export const postMessage = asyncHandler(async (req, res) => {
  const message = await messageService.postMessage(+req.params.expenseId, req.user.id, req.body.content);
  res.status(201).json(new ApiResponse(201, message, 'Message sent'));
});

export const deleteMessage = asyncHandler(async (req, res) => {
  await messageService.deleteMessage(+req.params.id, req.user.id);
  res.json(new ApiResponse(200, null, 'Message deleted'));
});