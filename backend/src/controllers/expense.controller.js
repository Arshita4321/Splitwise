// src/controllers/expense.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as expenseService from '../services/expense.service.js';

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, expense, 'Expense created'));
});

export const getGroupExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.getGroupExpenses(+req.params.groupId, req.user.id);
  res.json(new ApiResponse(200, expenses));
});

export const getExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(+req.params.id, req.user.id);
  res.json(new ApiResponse(200, expense));
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(+req.params.id, req.user.id, req.body);
  res.json(new ApiResponse(200, expense, 'Expense updated'));
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(+req.params.id, req.user.id);
  res.json(new ApiResponse(200, null, 'Expense deleted'));
});