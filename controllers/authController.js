const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const LabAssistant = require('../models/LabAssistant');
const Receptionist = require('../models/Receptionist');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');

// Helper function to get model based on role
const getModelByRole = (role) => {
  switch (role) {
    case ROLES.ADMIN: return Admin;
    case ROLES.DOCTOR: return Doctor;
    case ROLES.LAB_ASSISTANT: return LabAssistant;
    case ROLES.RECEPTIONIST: return Receptionist;
    default: return null;
  }
};

// Helper to find user by email across all models
const findUserByEmail = async (email) => {
  const models = [Admin, Doctor, LabAssistant, Receptionist];
  for (const Model of models) {
    const user = await Model.findOne({ email }).select('+password');
    if (user) return user;
  }
  return null;
};

// Helper function to create and send token
const createSendToken = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, passwordConfirm, phone, role } = req.body;

  // 1) Validate input
  if (!Object.values(ROLES).includes(role)) {
    return next(new AppError('Invalid user role', 400));
  }

  // 2) Check if email exists across all user types
  const emailExists = await findUserByEmail(email);
  if (emailExists) {
    return next(new AppError('Email address is already in use', 400));
  }

  // 3) Check if phone number exists across all user types
  const phoneExists = await findUserByPhone(phone);
  if (phoneExists) {
    return next(new AppError('Phone number is already in use', 400));
  }
  // 4) Authorization logic
  if (isInitialSetup) {
    // Only allow admin creation during initial setup
    if (role !== ROLES.ADMIN) {
      return next(new AppError('Initial setup requires creating an admin account', 400));
    }
  } else {
    // After initial setup, only admins can register new users
    if (!req.user || req.user.role !== ROLES.ADMIN) {
      return next(new AppError('Only admins can register new users', 403));
    }
    
    // Prevent creating other admins unless explicitly allowed
    if (role === ROLES.ADMIN && !req.body.allowAdminCreation) {
      return next(new AppError('Special permission required to create admin accounts', 403));
    }
  }

  // 5) Create user
  const Model = getModelByRole(role);
  const newUser = await Model.create({
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    phone,
    role,
    active: true
  });

  // 6) Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'user',
    entityId: newUser._id,
    user: isInitialSetup ? newUser._id : req.user._id, // Log admin who created the user
    userModel: isInitialSetup ? Model.modelName : req.user.constructor.modelName,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 7) Send response
  if (isInitialSetup) {
    createSendToken(newUser, 201, res);
  } else {
    res.status(201).json({
      status: 'success',
      data: { user: newUser }
    });
  }
});

const findUserByPhone = async (phone) => {
  const models = [Admin, Doctor, LabAssistant, Receptionist];
  for (const Model of models) {
    const user = await Model.findOne({ phone });
    if (user) return user;
  }
  return null;
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  console.log('Request body received:', req.body); // Add this line
  console.log('Headers:', req.headers);
  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  console.log('Received login request with:', req.body);
  // 2) Find user and check password
  const user = await findUserByEmail(email);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Check if user is active
  if (!user.active) {
    return next(new AppError('Your account has been deactivated', 401));
  }

  // 4) Log the login
  await AuditLog.create({
    action: 'login',
    entity: 'user',
    entityId: user._id,
    user: user._id,
    userModel: user.constructor.modelName,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 5) Send token
  createSendToken(user, 200, res);
});

// @desc    Logout user
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = catchAsync(async (req, res, next) => {
  if (req.user) {
    await AuditLog.create({
      action: 'logout',
      entity: 'user',
      entityId: req.user._id,
      user: req.user._id,
      userModel: req.user.constructor.modelName,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});


// @desc    Protect routes - check if user is authenticated
// @route   (Middleware)
// @access  Private
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user exists
  const Model = getModelByRole(decoded.role);
  const currentUser = await Model.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4) Check if user changed password
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please log in again.', 401));
  }

  req.user = currentUser;
  next();
});

// @desc    Restrict to certain roles
// @route   (Middleware)
// @access  Private
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// @desc    Update my password
// @route   PATCH /api/v1/auth/update-my-password
// @access  Private
exports.updateMyPassword = catchAsync(async (req, res, next) => {
  // 1) Get user
  const user = await req.user.constructor.findById(req.user._id).select('+password');

  // 2) Check current password
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) Update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();

  // 4) Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'user',
    entityId: user._id,
    user: user._id,
    userModel: user.constructor.modelName,
    changes: { password: 'updated' },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 5) Send new token
  createSendToken(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user
  const user = await findUserByEmail(req.body.email);
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
   
      await emailService.sendPasswordReset({
       email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        resetURL
      
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error('Email sending error:', err);
  }
});

// @desc    Reset password
// @route   PATCH /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await findUserByResetToken(hashedToken);
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 2) Update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'user',
    entityId: user._id,
    user: user._id,
    userModel: user.constructor.modelName,
    changes: { password: 'reset' },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // 4) Send token
  createSendToken(user, 200, res);
});

// Helper to find user by reset token
async function findUserByResetToken(token) {
  const models = [Admin, Doctor, LabAssistant, Receptionist];
  for (const Model of models) {
    const user = await Model.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
    if (user) return user;
  }
  return null;
}

// @desc    Get my profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await req.user.constructor.findById(req.user._id);
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// @desc    Update my profile
// @route   PATCH /api/v1/auth/update-me
// @access  Private
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Prevent password updates
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates. Please use /update-my-password.', 400));
  }

  // 2) Filter allowed fields
  const allowedFields = ['firstName', 'lastName', 'email', 'phone'];
  const filteredBody = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) filteredBody[key] = req.body[key];
  });

  // 3) Update user
  const updatedUser = await req.user.constructor.findByIdAndUpdate(
    req.user._id,
    filteredBody,
    { new: true, runValidators: true }
  );

  // 4) Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'user',
    entityId: req.user._id,
    user: req.user._id,
    userModel: req.user.constructor.modelName,
    changes: filteredBody,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// @desc    Deactivate my account
// @route   DELETE /api/v1/auth/deactivate-me
// @access  Private
exports.deactivateMe = catchAsync(async (req, res, next) => {
  await req.user.constructor.findByIdAndUpdate(req.user._id, { active: false });

  await AuditLog.create({
    action: 'update',
    entity: 'user',
    entityId: req.user._id,
    user: req.user._id,
    userModel: req.user.constructor.modelName,
    changes: { active: false },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});