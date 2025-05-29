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
    console.log('🔐 Checking for token...');
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📥 Token from Authorization header:', token);
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
      console.log('📥 Token from cookies:', token);
    }

    if (!token) {
      console.log('❌ No token found');
      return next(new AppError('Authentication required', 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', decoded);

    const Model = getModelByRole(decoded.role);
    if (!Model) {
      console.log(`❌ No model found for role: ${decoded.role}`);
      return next(new AppError('Invalid user role', 401));
    }

    const currentUser = await Model.findById(decoded.id);
    if (!currentUser) {
      console.log('❌ User not found in database');
      return next(new AppError('User no longer exists', 401));
    }

    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      console.log('❌ Password changed after token was issued');
      return next(new AppError('User changed password. Please log in again.', 401));
    }

    req.user = {
      ...currentUser.toObject(),
      role: decoded.role
    };

    console.log('✅ User authenticated:', req.user.role, req.user._id);
    next();
  } catch (err) {
    console.error('❌ Error in protect middleware:', err);
    next(err);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log('🔒 RestrictTo roles:', roles, '| Current role:', req.user.role);
    if (!roles.includes(req.user.role)) {
      console.log('❌ Role not authorized');
      return next(new AppError('Insufficient role privileges', 403));
    }
    console.log('✅ Role authorized');
    next();
  };
};

const checkPermissions = (resource, action) => {
  return (req, res, next) => {
    const { role } = req.user;
    console.log(`🔎 Checking permission for role: ${role}, resource: ${resource}, action: ${action}`);
    
    if (!ROLE_PERMISSIONS[role]?.[resource]?.includes(action)) {
      console.log(`❌ Permission denied for role: ${role}`);
      return next(new AppError(`Action "${action}" not permitted on "${resource}"`, 403));
    }

    console.log(`✅ Permission granted`);
    next();
  };
};

module.exports = { protect, restrictTo, checkPermissions };
