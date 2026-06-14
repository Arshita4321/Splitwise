// src/controllers/balance.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as balanceService from '../services/balance.service.js';

export const getGroupBalances = asyncHandler(async (req, res) => {
  const data = await balanceService.getGroupBalances(+req.params.groupId, req.user.id);
  res.json(new ApiResponse(200, data));
});

export const getMyBalances = asyncHandler(async (req, res) => {
  const data = await balanceService.getUserBalanceSummary(req.user.id);
  res.json(new ApiResponse(200, data));
});

export const recordPayment = asyncHandler(async (req, res) => {
  const payment = await balanceService.recordPayment(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, payment, 'Payment recorded'));
});

export const getGroupPayments = asyncHandler(async (req, res) => {
  const payments = await balanceService.getGroupPayments(+req.params.groupId, req.user.id);
  res.json(new ApiResponse(200, payments));
});