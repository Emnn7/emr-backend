const AuditLog = require('../models/AuditLog');

const auditLogMiddleware = async (req, res, next) => {
  const oldSend = res.send;
  const oldJson = res.json;
  
  res.send = function (data) {
    logAction(req, res, data);
    oldSend.apply(res, arguments);
  };
  
  res.json = function (data) {
    logAction(req, res, data);
    oldJson.apply(res, arguments);
  };
  
  next();
};

async function logAction(req, res, responseData) {
  try {
    // Skip logging for certain routes
    if (req.path.includes('/healthcheck') || req.method === 'OPTIONS') {
      return;
    }

    const status = res.statusCode < 400 ? 'success' : 'failed';
    const changes = req.method === 'PATCH' || req.method === 'PUT' ? req.body : undefined;
    
    await AuditLog.create({
      action: req.method.toLowerCase(),
      entity: getEntityFromPath(req.path),
      entityId: req.params.id,
      user: req.user?.id,
      userModel: req.user?.role ? req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1) : 'Anonymous',
      changes,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status,
      errorMessage: status === 'failed' ? responseData.message : undefined
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}

function getEntityFromPath(path) {
  if (path.includes('lab-orders')) return 'LabOrder';
  if (path.includes('lab-reports')) return 'LabReport';
  if (path.includes('vital-signs')) return 'VitalSigns';
  if (path.includes('patients')) return 'Patient';
  if (path.includes('users')) return 'User';
  return 'System';
}

module.exports = auditLogMiddleware;