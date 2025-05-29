const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const LabAssistant = require('../models/LabAssistant');
const Receptionist = require('../models/Receptionist');
const AppError = require('../utils/appError');
const { ROLES } = require('../config/roles');

// Permission configuration
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    medicalReports: ['readAll', 'read', 'generate', 'delete'],
    patients: ['create', 'read', 'update', 'delete']
  },
  [ROLES.DOCTOR]: {
    medicalReports: ['read', 'generate'],
    patients: ['read']
  },
  [ROLES.LAB_ASSISTANT]: {
    medicalReports: ['read'],
    patients: []
  },
  [ROLES.RECEPTIONIST]: {
    medicalReports: [],
    patients: ['create', 'read']
  }
};

const getModelByRole = (role) => {
  const models = {
    [ROLES.ADMIN]: Admin,
    [ROLES.DOCTOR]: Doctor,
    [ROLES.LAB_ASSISTANT]: LabAssistant,
    [ROLES.RECEPTIONIST]: Receptionist
  };
  return models[role] || null;
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Authentication required', 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const Model = getModelByRole(decoded.role);
    const currentUser = await Model.findById(decoded.id);
    
    if (!currentUser || currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User no longer exists or changed password', 401));
    }

    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient role privileges', 403));
    }
    next();
  };
};

const checkPermissions = (resource, action) => {
  return (req, res, next) => {
    const { role } = req.user;
    
    if (!ROLE_PERMISSIONS[role]?.[resource]?.includes(action)) {
      return next(new AppError(`Action "${action}" not permitted on "${resource}"`, 403));
    }
    next();
  };
};

module.exports = { protect, restrictTo, checkPermissions };