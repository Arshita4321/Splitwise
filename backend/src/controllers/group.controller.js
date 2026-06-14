// src/controllers/group.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as groupService from '../services/group.service.js';

// ─── Groups ──────────────────────────────────────────────────────────────────

export const createGroup = asyncHandler(async (req, res) => {
  const { name, currency } = req.body;
  const group = await groupService.createGroup(name, currency, req.user.id);
  res.status(201).json(new ApiResponse(201, group, 'Group created'));
});

export const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await groupService.getUserGroups(req.user.id);
  res.json(new ApiResponse(200, groups));
});

export const getGroup = asyncHandler(async (req, res) => {
  const group = await groupService.getGroupById(+req.params.id, req.user.id);
  const members = await groupService.getGroupMembers(+req.params.id);
  res.json(new ApiResponse(200, { ...group, members }));
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await groupService.updateGroup(+req.params.id, req.user.id, req.body);
  res.json(new ApiResponse(200, group, 'Group updated'));
});

export const deleteGroup = asyncHandler(async (req, res) => {
  await groupService.deleteGroup(+req.params.id, req.user.id);
  res.json(new ApiResponse(200, null, 'Group deleted'));
});

// ─── Members ─────────────────────────────────────────────────────────────────

export const getMembers = asyncHandler(async (req, res) => {
  const members = await groupService.getGroupMembers(+req.params.id);
  res.json(new ApiResponse(200, members));
});

export const addMember = asyncHandler(async (req, res) => {
  const member = await groupService.addMemberDirectly(+req.params.id, req.user.id, +req.body.user_id);
  res.status(201).json(new ApiResponse(201, member, 'Member added'));
});

export const removeMember = asyncHandler(async (req, res) => {
  await groupService.removeMember(+req.params.id, req.user.id, +req.params.userId);
  res.json(new ApiResponse(200, null, 'Member removed'));
});

// ─── Invites ─────────────────────────────────────────────────────────────────

export const inviteUser = asyncHandler(async (req, res) => {
  const invite = await groupService.inviteByEmail(+req.params.id, req.user.id, req.body.email);
  res.status(201).json(new ApiResponse(201, invite, 'Invite sent'));
});

export const respondInvite = asyncHandler(async (req, res) => {
  const result = await groupService.respondToInvite(+req.params.inviteId, req.user.id, req.body.action);
  res.json(new ApiResponse(200, null, result.message));
});

export const getMyInvites = asyncHandler(async (req, res) => {
  const invites = await groupService.getPendingInvitesForUser(req.user.id);
  res.json(new ApiResponse(200, invites));
});

export const getGroupInvites = asyncHandler(async (req, res) => {
  const invites = await groupService.getGroupInvites(+req.params.id, req.user.id);
  res.json(new ApiResponse(200, invites));
});