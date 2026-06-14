import client from './client'

// ─── Groups CRUD ──────────────────────────────────────────────
export const createGroup = (payload) =>
  client.post('/groups', payload).then((r) => r.data)

export const getMyGroups = () => client.get('/groups').then((r) => r.data)

export const getGroup = (id) => client.get(`/groups/${id}`).then((r) => r.data)

export const updateGroup = (id, payload) =>
  client.put(`/groups/${id}`, payload).then((r) => r.data)

export const deleteGroup = (id) =>
  client.delete(`/groups/${id}`).then((r) => r.data)

// ─── Members ──────────────────────────────────────────────────
export const getMembers = (id) =>
  client.get(`/groups/${id}/members`).then((r) => r.data)

export const addMember = (id, userId) =>
  client.post(`/groups/${id}/members`, { user_id: userId }).then((r) => r.data)

export const removeMember = (id, userId) =>
  client.delete(`/groups/${id}/members/${userId}`).then((r) => r.data)

// ─── Invites ──────────────────────────────────────────────────
export const inviteUser = (id, email) =>
  client.post(`/groups/${id}/invites`, { email }).then((r) => r.data)

export const getGroupInvites = (id) =>
  client.get(`/groups/${id}/invites`).then((r) => r.data)

export const respondInvite = (inviteId, action) =>
  client
    .post(`/groups/invites/${inviteId}/respond`, { action })
    .then((r) => r.data)

export const getMyInvites = () =>
  client.get('/groups/me/invites').then((r) => r.data)
