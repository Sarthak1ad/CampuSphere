/**
 * NOTIFICATION CONTROLLER
 */
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { user: req.user._id, isArchived: false };
  if (unreadOnly === 'true') filter.isRead = false;

  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false, isArchived: false });

  res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

exports.markRead = asyncHandler(async (req, res) => {
  const { ids } = req.body; // Array of notification IDs, or empty for "mark all"
  const filter = { user: req.user._id };
  if (ids?.length) filter._id = { $in: ids };

  // MongoDB Concept: updateMany — update all matching documents in one operation
  await Notification.updateMany(filter, {
    $set: { isRead: true, readAt: new Date() },
  });

  res.json({ success: true, message: 'Notifications marked as read' });
});

exports.archiveNotification = asyncHandler(async (req, res) => {
  const notif = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notif) throw ApiError.notFound('Notification not found');

  // Setting archivedAt triggers the TTL index — document auto-deletes after 30 days
  notif.isArchived = true;
  notif.archivedAt = new Date();
  await notif.save();

  res.json({ success: true, message: 'Notification archived' });
});

exports.clearAll = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: true },
    { $set: { isArchived: true, archivedAt: new Date() } }
  );
  res.json({ success: true, message: 'Read notifications cleared' });
});
