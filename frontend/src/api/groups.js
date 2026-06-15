import client from './client.js';

export const createGroup     = data            => client.post('/groups', data);
export const getMyGroups     = ()              => client.get('/groups');
export const getGroup        = id              => client.get(`/groups/${id}`);
export const updateGroup     = (id, data)      => client.put(`/groups/${id}`, data);
export const deleteGroup     = id              => client.delete(`/groups/${id}`);

export const getMembers      = id              => client.get(`/groups/${id}/members`);
export const addMember       = (id, data)      => client.post(`/groups/${id}/members`, data);
export const removeMember    = (id, userId)    => client.delete(`/groups/${id}/members/${userId}`);

export const inviteUser      = (id, data)      => client.post(`/groups/${id}/invites`, data);
export const getGroupInvites = id              => client.get(`/groups/${id}/invites`);
export const getMyInvites    = ()              => client.get('/groups/me/invites');
export const respondInvite   = (inviteId, data)=> client.post(`/groups/invites/${inviteId}/respond`, data);