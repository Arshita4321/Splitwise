import client from './client.js';

export const createExpense    = data       => client.post('/expenses', data);
export const getGroupExpenses = groupId    => client.get(`/expenses/group/${groupId}`);
export const getExpense       = id         => client.get(`/expenses/${id}`);
export const updateExpense    = (id, data) => client.put(`/expenses/${id}`, data);
export const deleteExpense    = id         => client.delete(`/expenses/${id}`);