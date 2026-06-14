import client from './client'

// POST /api/auth/register  -> { user, token }
export const register = (payload) =>
  client.post('/auth/register', payload).then((r) => r.data)

// POST /api/auth/login  -> { user, token }
export const login = (payload) =>
  client.post('/auth/login', payload).then((r) => r.data)

// GET /api/auth/me  -> { user }
export const getMe = () => client.get('/auth/me').then((r) => r.data)
