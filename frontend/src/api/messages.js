import client from './client.js';

export const getMessages   = expenseId         => client.get(`/messages/expense/${expenseId}`);
export const postMessage   = (expenseId, data) => client.post(`/messages/expense/${expenseId}`, data);
export const deleteMessage = id                => client.delete(`/messages/${id}`);