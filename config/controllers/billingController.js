const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const pdfService = require('../services/pdfService');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Get all billings
// @route   GET /api/billings
// @access  Private/Admin, Receptionist
exports.getAllBillings = catchAsync(async (req, res, next) => {
  let query;

  // Check user role and filter accordingly
  if (req.user.role === ROLES.RECEPTIONIST) {
    query = Billing.find();
  } else if (req.user.role === ROLES.PATIENT) {
    query = Billing.find({ patient: req.user.id });
  } else {
    query = Billing.find();
  }

  const billings = await query.sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: billings.length,
    data: {
      billings
    }
  });
});

// @desc    Get a single billing
// @route   GET /api/v1/billing/:id
// @access  Private
exports.getBilling = catchAsync(async (req, res, next) => {
  const billing = await Billing.findById(req.params.id);

  if (!billing) {
    return next(new AppError('No billing found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    billing.patient.toString() !== req.user.id.toString()
  ) {
    return next(new AppError('You are not authorized to view this billing', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      billing
    }
  });
});

// @desc    Create a new billing
// @route   POST /api/v1/billing
// @access  Private/Admin, Receptionist
exports.createBilling = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.body.patient);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check if appointment exists if provided
  if (req.body.appointment) {
    const appointment = await Appointment.findById(req.body.appointment);
    if (!appointment) {
      return next(new AppError('No appointment found with that ID', 404));
    }
  }

  // Calculate total if not provided
  if (!req.body.total) {
    req.body.total = req.body.items.reduce(
      (acc, item) => acc + item.total,
      0
    );
  }

  const newBilling = await Billing.create({
    ...req.body,
    createdBy: req.user.id,
    createdByModel: capitalizeFirstLetter(req.user.role)
  });

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'billing',
    entityId: newBilling._id,
    user: req.user.id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    status: 'success',
    data: {
      billing: newBilling
    }
  });
});

// @desc    Update a billing
// @route   PATCH /api/v1/billing/:id
// @access  Private/Admin, Receptionist
exports.updateBilling = catchAsync(async (req, res, next) => {
  const billing = await Billing.findById(req.params.id);

  if (!billing) {
    return next(new AppError('No billing found with that ID', 404));
  }

  // Check permissions
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.RECEPTIONIST) {
    return next(new AppError('You are not authorized to update this billing', 403));
  }

  // Prevent updating certain fields
  if (req.body.patient || req.body.createdBy || req.body.createdByModel) {
    return next(
      new AppError('You cannot change patient or creator information', 400)
    );
  }

  // Recalculate total if items are updated
  if (req.body.items) {
    req.body.total = req.body.items.reduce(
      (acc, item) => acc + item.total,
      0
    );
  }

  const updatedBilling = await Billing.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'billing',
    entityId: updatedBilling._id,
    user: req.user.id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      billing: updatedBilling
    }
  });
});

// @desc    Delete a billing
// @route   DELETE /api/v1/billing/:id
// @access  Private/Admin
exports.deleteBilling = catchAsync(async (req, res, next) => {
  const billing = await Billing.findByIdAndDelete(req.params.id);

  if (!billing) {
    return next(new AppError('No billing found with that ID', 404));
  }

  // Check permissions
  if (req.user.role !== ROLES.ADMIN) {
    return next(new AppError('You are not authorized to delete this billing', 403));
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'billing',
    entityId: req.params.id,
    user: req.user.id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Generate billing invoice PDF
// @route   GET /api/v1/billing/:id/invoice
// @access  Private
exports.generateInvoice = catchAsync(async (req, res, next) => {
  const billing = await Billing.findById(req.params.id).populate(
    'patient',
    'firstName lastName phone address'
  );

  if (!billing) {
    return next(new AppError('No billing found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    billing.patient._id.toString() !== req.user.id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view this invoice', 403)
    );
  }

  // Generate PDF
  const invoicePath = await pdfService.generateInvoice(billing);

  // Log the action
  await AuditLog.create({
    action: 'read',
    entity: 'billing',
    entityId: billing._id,
    user: req.user.id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.download(invoicePath);
});

// @desc    Get billings by patient
// @route   GET /api/v1/billing/patient/:patientId
// @access  Private
exports.getBillingsByPatient = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    req.params.patientId !== req.user.id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view these billings', 403)
    );
  }

  const billings = await Billing.find({ patient: req.params.patientId }).sort(
    '-createdAt'
  );

  res.status(200).json({
    status: 'success',
    results: billings.length,
    data: {
      billings
    }
  });
});

// @desc    Get billings by status
// @route   GET /api/v1/billing/status/:status
// @access  Private/Admin, Receptionist
exports.getBillingsByStatus = catchAsync(async (req, res, next) => {
  const validStatuses = ['pending', 'paid', 'partially-paid', 'cancelled'];
  if (!validStatuses.includes(req.params.status)) {
    return next(new AppError('Invalid status specified', 400));
  }

  const billings = await Billing.find({ status: req.params.status }).sort(
    '-createdAt'
  );

  res.status(200).json({
    status: 'success',
    results: billings.length,
    data: {
      billings
    }
  });
});