// src/api/import.js
import axios from 'axios';

// Use a separate axios instance for multipart uploads
const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const uploadCSV = (groupId, file, onProgress) => {
  const form = new FormData();
  form.append('csv', file);
  return client.post(`/import/group/${groupId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  });
};

export const getImportSessions = groupId =>
  client.get(`/import/group/${groupId}/sessions`);

export const getImportReport = sessionId =>
  client.get(`/import/sessions/${sessionId}/report`);

export const resolvePendingRow = (pendingRowId, action) =>
  client.post(`/import/pending/${pendingRowId}/resolve`, { action });