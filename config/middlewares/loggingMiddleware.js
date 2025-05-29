const AuditLog = require('../models/AuditLog');

const logRequest = async (req, res, next) => {
  // Skip logging for these endpoints
  const excludedPaths = ['/api/auth/login', '/api/auth/logout'];
  
  if (excludedPaths.includes(req.path)) {
    return next();
  }

  try {
    await AuditLog.create({
      action: req.method.toLowerCase(),
      entity: req.path.split('/')[3] || 'unknown',
      entityId: req.params.id || null,
      user: req.user?.id || null,
      userModel: req.user?.role || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log request:', err);
  }

  next();
};

module.exports = logRequest;