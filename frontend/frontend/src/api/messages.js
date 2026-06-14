import client from './client'

// GET /api/messages/expense/:expenseId
export const getMessages = (expenseId) =>
  client.get(`/messages/expense/${expenseId}`).then((r) => r.data)

// POST /api/messages/expense/:expenseId
export const postMessage = (expenseId, content) =>
  client
    .post(`/messages/expense/${expenseId}`, { content })
    .then((r) => r.data)

// DELETE /api/messages/:id
export const deleteMessage = (id) =>
  client.delete(`/messages/${id}`).then((r) => r.data)
