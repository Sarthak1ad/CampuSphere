/**
 * USER ADMIN CONTROLLER
 */
const User = require('../models/User');
const Registration = require('../models/Registration');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Notification = require('../models/Notification');
const { auditLog } = require('../services/auditService');

exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search, isActive } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) filter.$text = { $search: search };

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-passwordHash')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({ success: true, data: users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
});

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, data: user });
});

// Soft delete: deactivate user
exports.deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false } },
    { new: true }
  );
  if (!user) throw ApiError.notFound('User not found');

  await auditLog({
    actor: req.user, action: 'user.deactivate', entity: 'User',
    entityId: user._id, meta: { reason: req.body.reason }, ipAddress: req.ip, level: 'warning',
  });

  res.json({ success: true, message: 'User deactivated' });
});

exports.activateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { isActive: true } }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, message: 'User activated', data: user });
});

exports.toggleActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
});

// Verify or reject an organizer
// Accepts: { action: 'verify'|'reject' } OR { status: 'verified'|'rejected' } from frontend
exports.verifyOrganizer = asyncHandler(async (req, res) => {
  const { action, status, reason, adminRating, complianceNotes, rating } = req.body;
  // Normalize: frontend sends 'status: verified/rejected', legacy uses 'action: verify/reject'
  const resolvedAction = action || (status === 'verified' ? 'verify' : status === 'rejected' ? 'reject' : null);
  const resolvedRating = adminRating ?? rating;
  if (!['verify', 'reject'].includes(resolvedAction)) throw ApiError.badRequest('Action must be verify or reject');

  const update = {
    'organizerProfile.verificationStatus': resolvedAction === 'verify' ? 'verified' : 'rejected',
    'organizerProfile.verifiedAt': resolvedAction === 'verify' ? new Date() : undefined,
    'organizerProfile.rejectionReason': resolvedAction === 'reject' ? reason : undefined,
    'organizerProfile.adminRating': resolvedRating,
    'organizerProfile.complianceNotes': complianceNotes,
  };

  const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!user || user.role !== 'organizer') throw ApiError.notFound('Organizer not found');

  await Notification.create({
    user: user._id,
    type: resolvedAction === 'verify' ? 'organizer_verified' : 'organizer_rejected',
    title: `Organizer Profile ${resolvedAction === 'verify' ? 'Verified' : 'Rejected'}`,
    message: resolvedAction === 'verify'
      ? 'Your organizer profile has been verified. You can now create and publish events!'
      : `Your organizer profile was rejected. Reason: ${reason || 'Please contact admin.'}`,
  });

  await auditLog({
    actor: req.user, action: `organizer.${resolvedAction}`, entity: 'User',
    entityId: user._id, meta: { reason, resolvedRating }, ipAddress: req.ip, level: 'warning',
  });

  res.json({ success: true, message: `Organizer ${resolvedAction}d`, data: user });
});


exports.getPlatformFeedback = asyncHandler(async (req, res) => {
  const PlatformFeedback = require('../models/PlatformFeedback');
  const { status, type, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const total = await PlatformFeedback.countDocuments(filter);
  const items = await PlatformFeedback.find(filter)
    .populate('user', 'name email')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.json({ success: true, data: items, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
});

exports.updatePlatformFeedback = asyncHandler(async (req, res) => {
  const PlatformFeedback = require('../models/PlatformFeedback');
  const { status, adminNote, priority } = req.body;
  const item = await PlatformFeedback.findByIdAndUpdate(
    req.params.id,
    { $set: { status, adminNote, priority, ...(status === 'done' ? { resolvedAt: new Date() } : {}) } },
    { new: true }
  );
  if (!item) throw ApiError.notFound('Platform feedback not found');
  res.json({ success: true, data: item });
});
