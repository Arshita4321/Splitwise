import client from './client.js';

export const getMyBalances    = ()       => client.get('/balances/me');
export const getGroupBalances = groupId  => client.get(`/balances/group/${groupId}`);
export const getGroupPayments = groupId  => client.get(`/balances/group/${groupId}/payments`);
export const recordPayment    = data     => client.post('/balances/settle', data);