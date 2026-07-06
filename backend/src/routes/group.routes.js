// src/routes/group.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createGroupSchema, updateGroupSchema, inviteUserSchema,
  addMemberSchema, respondInviteSchema,
} from '../validators/group.validator.js';
import {
  createGroup, getMyGroups, getGroup, updateGroup, deleteGroup,
  getMembers, addMember, removeMember,
  inviteUser, respondInvite, getMyInvites, getGroupInvites,
} from '../controllers/group.controller.js';

const router = Router();
router.use(authenticate);

// My pending invites (across all groups) - MUST BE FIRST to avoid collision with /:id and /:id/invites
router.get('/me/invites', getMyInvites);

// Groups CRUD
router.post('/',        validate(createGroupSchema), createGroup);
router.get('/',         getMyGroups);
router.get('/:id',      getGroup);
router.put('/:id',      validate(updateGroupSchema), updateGroup);
router.delete('/:id',   deleteGroup);

// Members
router.get('/:id/members',              getMembers);
router.post('/:id/members',             validate(addMemberSchema), addMember);
router.delete('/:id/members/:userId',   removeMember);

// Invites
router.post('/:id/invites',                        validate(inviteUserSchema),    inviteUser);
router.get('/:id/invites',                         getGroupInvites);
router.post('/invites/:inviteId/respond',           validate(respondInviteSchema), respondInvite);

export default router;