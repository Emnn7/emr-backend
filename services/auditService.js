const AuditLog = require('../models/AuditLog');

exports.logAction = async (actionData) => {
  try {
    await AuditLog.create(actionData);
  } catch (err) {
    console.error('Failed to log action:', err);
  }
};

exports.getUserActivity = async (userId, userModel, limit = 50) => {
  return AuditLog.find({ user: userId, userModel })
    .sort('-timestamp')
    .limit(limit);
};

exports.getEntityActivity = async (entity, entityId, limit = 50) => {
  return AuditLog.find({ entity, entityId })
    .sort('-timestamp')
    .limit(limit);
};

exports.getRecentActivity = async (limit = 100) => {
  return AuditLog.find()
    .sort('-timestamp')
    .limit(limit)
    .populate('user', 'firstName lastName role');
};