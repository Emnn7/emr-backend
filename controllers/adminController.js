const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment'); 
const Prescription = require('../models/Prescription'); 
const LabOrder = require('../models/LabOrder'); 
const LabReport = require('../models/LabReport'); 
const Billing = require('../models/Billing'); 
const Payment = require('../models/Payment'); 
const LabAssistant = require('../models/LabAssistant');
const Receptionist = require('../models/Receptionist');
const Patient = require('../models/Patient');
const AppError = require('../utils/appError');
const LabTest = require('../models/LabTest');
const SystemSetting = require('../models/Setting');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission, PERMISSION_DETAILS } = require('../config/roles');
const AuditLog = require('../models/AuditLog');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};


// Helper function to get model based on role
const getModelByRole = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return Admin;
    case ROLES.DOCTOR:
      return Doctor;
    case ROLES.LAB_ASSISTANT:
      return LabAssistant;
    case ROLES.RECEPTIONIST:
      return Receptionist;
    default:
      return null;
  }
};

// @desc    Create a new user (admin, doctor, lab assistant, receptionist)
// @route   POST /api/v1/admin/users
// @access  Private/Admin
exports.createUser = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  if (role === ROLES.PATIENT) {
    return next(new AppError('Use patient registration endpoint for patients', 400));
  }

  const Model = getModelByRole(role);
  const newUser = await Model.create({
    ...req.body,
    active: true
  });
  

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'user',   // <-- always 'user' for admin/doctor/receptionist/labassistant
    entityId: newUser._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser
    }
  });
});


// @desc    Get all users of a specific role
// @route   GET /api/v1/admin/users/:role
// @access  Private/Admin
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { role } = req.params;

  if (!Object.values(ROLES).includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  if (role === ROLES.PATIENT) {
    return next(new AppError('Use patient endpoint for patients', 400));
  }

  const Model = getModelByRole(role);
  const users = await Model.find().select('-__v -password');

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

// @desc    Get a single user by ID and role
// @route   GET /api/v1/admin/users/:role/:id
// @access  Private/Admin
exports.getUser = catchAsync(async (req, res, next) => {
  const { role, id } = req.params;

  if (!Object.values(ROLES).includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  if (role === ROLES.PATIENT) {
    return next(new AppError('Use patient endpoint for patients', 400));
  }

  const Model = getModelByRole(role);
  const user = await Model.findById(id).select('-__v -password');

  if (!user) {
    return next(new AppError(`No ${role} found with that ID`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// @desc    Update a user by ID and role
// @route   PATCH /api/v1/admin/users/:role/:id
// @access  Private/Admin
exports.updateUser = catchAsync(async (req, res, next) => {
  const { role, id } = req.params;

  if (!Object.values(ROLES).includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  if (role === ROLES.PATIENT) {
    return next(new AppError('Use patient endpoint for patients', 400));
  }

  const Model = getModelByRole(role);
  const user = await Model.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true
  }).select('-__v -password');

  if (!user) {
    return next(new AppError(`No ${role} found with that ID`, 404));
  }

  await AuditLog.create({
    action: 'update',
    entity: 'user',  // <-- fix here too
    entityId: user._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});


// @desc    Delete a user by ID and role
// @route   DELETE /api/v1/admin/users/:role/:id
// @access  Private/Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  const { role, id } = req.params;

  if (!Object.values(ROLES).includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  if (role === ROLES.PATIENT) {
    return next(new AppError('Use patient endpoint for patients', 400));
  }

  const Model = getModelByRole(role);
  const user = await Model.findByIdAndDelete(id);

  if (!user) {
    return next(new AppError(`No ${role} found with that ID`, 404));
  }

  await AuditLog.create({
    action: 'delete',
    entity: 'user',  // <-- fix here too
    entityId: id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get all patients
// @route   GET /api/v1/admin/patients
// @access  Private/Admin
exports.getAllPatients = catchAsync(async (req, res, next) => {
  const patients = await Patient.find().select('-__v');

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: {
      patients
    }
  });
});

// @desc    Get a single patient by ID
// @route   GET /api/v1/admin/patients/:id
// @access  Private/Admin
exports.getPatient = catchAsync(async (req, res, next) => {
  const patient = await Patient.findById(req.params.id).select('-__v');

  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      patient
    }
  });
});

// @desc    Update a patient by ID
// @route   PATCH /api/v1/admin/patients/:id
// @access  Private/Admin
exports.updatePatient = catchAsync(async (req, res, next) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-__v');

  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'patient',
    entityId: patient._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      patient
    }
  });
});

// @desc    Delete a patient by ID
// @route   DELETE /api/v1/admin/patients/:id
// @access  Private/Admin
exports.deletePatient = catchAsync(async (req, res, next) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);

  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'patient',
    entityId: req.params.id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get system statistics
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
exports.getSystemStats = catchAsync(async (req, res, next) => {
  const stats = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    LabAssistant.countDocuments(),
    Receptionist.countDocuments(),
    Appointment.countDocuments(),
    Prescription.countDocuments(),
    LabOrder.countDocuments(),
    LabReport.countDocuments(),
    Billing.countDocuments(),
    Payment.countDocuments()
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        patients: stats[0],
        doctors: stats[1],
        labAssistants: stats[2],
        receptionists: stats[3],
        appointments: stats[4],
        prescriptions: stats[5],
        labOrders: stats[6],
        labReports: stats[7],
        billings: stats[8],
        payments: stats[9]
      }
    }
  });
});

// @desc    Get audit logs
// @route   GET /api/v1/admin/auditLogs
// @access  Private/Admin9 
exports.getAuditLogs = catchAsync(async (req, res, next) => {
  const logs = await AuditLog.find()
    .sort('-timestamp')
    .populate('user', 'firstName lastName role')
    .limit(100);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: {
      logs
    }
  });
});
// LAB TESTS MANAGEMENT
exports.getAllLabTests = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, sort = '-dateOfTest' } = req.query;

  const tests = await LabTest.find()
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('patientId', 'name');

  const count = await LabTest.countDocuments();

  res.status(200).json({
    status: 'success',
    tests,
    totalPages: Math.ceil(count / limit),
    currentPage: Number(page)
  });
});

// SYSTEM SETTINGS
exports.getSystemSettings = catchAsync(async (req, res, next) => {
  let settings = await SystemSetting.findOne();
  if (!settings) {
    settings = await SystemSetting.create({});
  }
  res.status(200).json({
    status: 'success',
    data: settings
  });
});

exports.updateSystemSettings = catchAsync(async (req, res, next) => {
  let settings = await SystemSetting.findOne();
  if (!settings) {
    settings = new SystemSetting(req.body);
  } else {
    Object.assign(settings, req.body);
  }

  await settings.save();
  res.status(200).json({
    status: 'success',
    data: settings
  });
});



// @desc    Get all system roles
// @route   GET /api/admin/roles
exports.getRoles = catchAsync(async (req, res) => {
  const roles = Object.values(ROLES)
    .filter(role => role !== ROLES.PATIENT) // Exclude patient if needed
    .map(role => ({
      id: role,
      name: capitalizeFirstLetter(role)
    }));

  res.status(200).json({ status: 'success', data: { roles } });
});

// @desc    Get all system permissions
// @route   GET /api/admin/permissions
exports.getPermissions = catchAsync(async (req, res) => {
  const permissions = Object.entries(PERMISSION_DETAILS).map(([key, val]) => ({
    id: key,
    name: val.description,
    category: val.category
  }));

  res.status(200).json({ status: 'success', data: { permissions } });
});

// @desc    Update user permissions
// @route   PATCH /api/v1/admin/users/:role/:id/permissions
exports.updateUserPermissions = catchAsync(async (req, res, next) => {
  const { role, id } = req.params;
  const { permissions } = req.body;

  const Model = getModelByRole(role);
  if (!Model) return next(new AppError('Invalid role', 400));

  const user = await Model.findByIdAndUpdate(
    id,
    { permissions },
    { new: true, runValidators: true }
  );

  if (!user) return next(new AppError('User not found', 404));

  // Prevent downgrading other admins
  if (user.role === ROLES.ADMIN && req.user._id !== user._id.toString()) {
    return next(new AppError('Cannot modify another admin\'s role', 403));
  }

  user.role = req.body.role;
  await user.save({ validateModifiedOnly: true });

  await AuditLog.create({
    action: 'update',
    entity: 'user',
    entityId: user._id,
    user: req.user._id,
    userModel: 'Admin',
    changes: { role: req.body.role },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// @desc    Update any user's permissions (admin only)
// @route   PATCH /api/v1/admin/users/:id/permissions
// @access  Private/Admin
exports.updateUserPermissions = catchAsync(async (req, res, next) => {
  // Prevent modifying other admins
  if (req.params.id === req.user._id) {
    return next(new AppError('You cannot modify your own permissions', 403));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  // Admins have all permissions implicitly
  if (user.role === ROLES.ADMIN) {
    return next(new AppError('Adins have all permissions by default', 400));
  }

  user.permissions = req.body.permissions;
  await user.save();

  await AuditLog.create({
    action: 'update',
    entity: 'user',
    entityId: user._id,
    user: req.user._id,
    userModel: 'Admin',
    changes: { permissions: req.body.permissions },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

