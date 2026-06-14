import client from './client'

// GET /api/balances/me  -> { overall_net, groups[] }
export const getMyBalances = () =>
  client.get('/balances/me').then((r) => r.data)

// GET /api/balances/group/:groupId -> { member_balances, pairwise, simplified_debts }
export const getGroupBalances = (groupId) =>
  client.get(`/balances/group/${groupId}`).then((r) => r.data)

// GET /api/balances/group/:groupId/payments
export const getGroupPayments = (groupId) =>
  client.get(`/balances/group/${groupId}/payments`).then((r) => r.data)

// POST /api/balances/settle
export const recordPayment = (payload) =>
  client.post('/balances/settle', payload).then((r) => r.data)
