import client from './client'

// POST /api/expenses
export const createExpense = (payload) =>
  client.post('/expenses', payload).then((r) => r.data)

// GET /api/expenses/group/:groupId
export const getGroupExpenses = (groupId) =>
  client.get(`/expenses/group/${groupId}`).then((r) => r.data)

// GET /api/expenses/:id
export const getExpense = (id) =>
  client.get(`/expenses/${id}`).then((r) => r.data)

// PUT /api/expenses/:id
export const updateExpense = (id, payload) =>
  client.put(`/expenses/${id}`, payload).then((r) => r.data)

// DELETE /api/expenses/:id
export const deleteExpense = (id) =>
  client.delete(`/expenses/${id}`).then((r) => r.data)
