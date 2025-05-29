const { ForbiddenError } = require('../utils/appError');
const { ROLES } = require('../config/roles');

const checkPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    // Skip check for public routes
    if (!requiredPermissions.length) return next();
    
    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(permission => {
      return req.user?.permissions?.includes(permission);
    });

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
};

const roleBasedAccess = (requiredRoles = []) => {
  return (req, res, next) => {
    // Allow all if no roles specified
    if (!requiredRoles.length) return next();
    
    if (!requiredRoles.includes(req.user?.role)) {
      throw new ForbiddenError('Access restricted to specific roles');
    }

    next();
  };
};

const dataOwnership = (modelName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const Model = require(`../models/${modelName}`);
      const doc = await Model.findById(req.params[idParam]);
      
      if (!doc) {
        return next(new NotFoundError(`${modelName} not found`));
      }

      // Admin bypass
      if (req.user.role === ROLES.ADMIN) return next();

      // Check ownership
      if (doc.user && doc.user.toString() !== req.user.id) {
        throw new ForbiddenError('You can only access your own records');
      }

      // Special cases
      if (modelName === 'LabOrder' && doc.doctor.toString() !== req.user.id) {
        throw new ForbiddenError('You can only access your own lab orders');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  checkPermissions,
  roleBasedAccess,
  dataOwnership
};