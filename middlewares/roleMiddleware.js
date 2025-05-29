const { checkPermission } = require('../config/roles');
const AppError = require('../utils/appError');

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.checkPermission = (resource, action) => {
  return (req, res, next) => {
    const hasPermission = checkPermission(req.user.role, resource, action);
    if (!hasPermission) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};