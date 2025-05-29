const LabReport = require('../models/LabReport');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const pdfService = require('../services/pdfService');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Get all lab reports
// @route   GET /api/v1/lab-reports
// @access  Private/Doctor, LabAssistant, Admin
exports.getAllLabReports = catchAsync(async (req, res, next) => {
  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = LabReport.find().populate({
      path: 'labOrder',
      match: { doctor: req.user._id }
    });
  } else if (req.user.role === ROLES.LAB_ASSISTANT) {
    query = LabReport.find({ performedBy: req.user._id });
  } else {
    query = LabReport.find();
  }

  const labReports = await query
    .populate('patient', 'firstName lastName phone')
    .populate('performedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .sort('-createdAt');

  // Filter out null lab orders for doctors
  const filteredReports =
    req.user.role === ROLES.DOCTOR
      ? labReports.filter(report => report.labOrder !== null)
      : labReports;

  res.status(200).json({
    status: 'success',
    results: filteredReports.length,
    data: {
      labReports: filteredReports
    }
  });
});

// @desc    Get a single lab report
// @route   GET /api/v1/lab-reports/:id
// @access  Private/Doctor, LabAssistant, Admin
exports.getLabReport = catchAsync(async (req, res, next) => {
  const labReport = await LabReport.findById(req.params.id)
    .populate('patient', 'firstName lastName phone')
    .populate('performedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .populate({
      path: 'labOrder',
      populate: {
        path: 'doctor',
        select: 'firstName lastName specialization'
      }
    });

  if (!labReport) {
    return next(new AppError('No lab report found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.LAB_ASSISTANT &&
    labReport.labOrder.doctor._id.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view this lab report', 403)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      labReport
    }
  });
});

// @desc    Create a new lab report
// @route   POST /api/v1/lab-reports
// @access  Private/LabAssistant, Admin
exports.createLabReport = catchAsync(async (req, res, next) => {
  // Check if lab order exists
  const labOrder = await LabOrder.findById(req.body.labOrder);
  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  // Check if patient exists
  const patient = await Patient.findById(req.body.patient);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Set the performedBy to the current user if lab assistant
  if (req.user.role === ROLES.LAB_ASSISTANT) {
    req.body.performedBy = req.user._id;
  }

    // Process test results
  req.body.tests = req.body.tests.map(test => ({
    testId: test.testId,
    name: test.name,
    result: test.result,
    unit: test.unit,
    normalRange: test.normalRange,
    abnormalFlag: test.abnormalFlag
  }));
  const newLabReport = await LabReport.create(req.body);

  // Update lab order status if all tests are completed
  const pendingTests = labOrder.tests.filter(
    test => test.status !== 'completed'
  ).length;
  if (pendingTests === 0) {
    labOrder.status = 'completed';
    await labOrder.save();
  }

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'labReport',
    entityId: newLabReport._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    status: 'success',
    data: {
      labReport: newLabReport
    }
  });
});

// @desc    Update a lab report
// @route   PATCH /api/v1/lab-reports/:id
// @access  Private/LabAssistant, Admin
exports.updateLabReport = catchAsync(async (req, res, next) => {
  const labReport = await LabReport.findById(req.params.id);

  if (!labReport) {
    return next(new AppError('No lab report found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    labReport.performedBy.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to update this lab report', 403)
    );
  }

  // Prevent updating certain fields
  if (req.body.patient || req.body.labOrder) {
    return next(
      new AppError('You cannot change patient or lab order information', 400)
    );
  }

  const updatedLabReport = await LabReport.findByIdAndUpdate(
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
    entity: 'labReport',
    entityId: updatedLabReport._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      labReport: updatedLabReport
    }
  });
});

// @desc    Verify a lab report
// @route   PATCH /api/v1/lab-reports/:id/verify
// @access  Private/Doctor, Admin
exports.verifyLabReport = catchAsync(async (req, res, next) => {
  const labReport = await LabReport.findById(req.params.id).populate({
    path: 'labOrder',
    populate: {
      path: 'doctor',
      select: 'firstName lastName'
    }
  });

  if (!labReport) {
    return next(new AppError('No lab report found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    labReport.labOrder.doctor._id.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to verify this lab report', 403)
    );
  }

  labReport.status = 'verified';
  labReport.verifiedBy = req.user._id;
  const updatedLabReport = await labReport.save();

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'labReport',
    entityId: updatedLabReport._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: { status: 'verified', verifiedBy: req.user._id },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      labReport: updatedLabReport
    }
  });
});

// @desc    Delete a lab report
// @route   DELETE /api/v1/lab-reports/:id
// @access  Private/Admin
exports.deleteLabReport = catchAsync(async (req, res, next) => {
  const labReport = await LabReport.findByIdAndDelete(req.params.id);

  if (!labReport) {
    return next(new AppError('No lab report found with that ID', 404));
  }

  // Check permissions
  if (req.user.role !== ROLES.ADMIN) {
    return next(
      new AppError('You are not authorized to delete this lab report', 403)
    );
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'labReport',
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

// @desc    Generate lab report PDF
// @route   GET /api/v1/lab-reports/:id/pdf
// @access  Private/Doctor, LabAssistant, Admin
exports.generateLabReportPDF = catchAsync(async (req, res, next) => {
  const labReport = await LabReport.findById(req.params.id)
    .populate('patient', 'firstName lastName phone dateOfBirth gender')
    .populate('performedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .populate({
      path: 'labOrder',
      populate: {
        path: 'doctor',
        select: 'firstName lastName specialization'
      }
    });

  if (!labReport) {
    return next(new AppError('No lab report found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.LAB_ASSISTANT &&
    labReport.labOrder.doctor._id.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view this lab report', 403)
    );
  }

  // Generate PDF
  const reportPath = await pdfService.generateLabReport(labReport);

  // Log the action
  await AuditLog.create({
    action: 'read',
    entity: 'labReport',
    entityId: labReport._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.download(reportPath);
});

// @desc    Get lab reports by patient
// @route   GET /api/v1/lab-reports/patient/:patientId
// @access  Private/Doctor, LabAssistant, Admin
exports.getLabReportsByPatient = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = LabReport.find({ patient: req.params.patientId }).populate({
      path: 'labOrder',
      match: { doctor: req.user._id }
    });
  } else {
    query = LabReport.find({ patient: req.params.patientId });
  }

  const labReports = await query
    .populate('patient', 'firstName lastName phone')
    .populate('performedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .sort('-createdAt');

  // Filter out null lab orders for doctors
  const filteredReports =
    req.user.role === ROLES.DOCTOR
      ? labReports.filter(report => report.labOrder !== null)
      : labReports;

  res.status(200).json({
    status: 'success',
    results: filteredReports.length,
    data: {
      labReports: filteredReports
    }
  });
});

// @desc    Get lab reports by status
// @route   GET /api/v1/lab-reports/status/:status
// @access  Private/Doctor, LabAssistant, Admin
exports.getLabReportsByStatus = catchAsync(async (req, res, next) => {
  const validStatuses = ['pending', 'completed', 'verified', 'cancelled'];
  if (!validStatuses.includes(req.params.status)) {
    return next(new AppError('Invalid status specified', 400));
  }

  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = LabReport.find({ status: req.params.status }).populate({
      path: 'labOrder',
      match: { doctor: req.user._id }
    });
  } else if (req.user.role === ROLES.LAB_ASSISTANT) {
    query = LabReport.find({
      status: req.params.status,
      performedBy: req.user._id
    });
  } else {
    query = LabReport.find({ status: req.params.status });
  }

  const labReports = await query
    .populate('patient', 'firstName lastName phone')
    .populate('performedBy', 'firstName lastName')
    .populate('verifiedBy', 'firstName lastName')
    .sort('-createdAt');

  // Filter out null lab orders for doctors
  const filteredReports =
    req.user.role === ROLES.DOCTOR
      ? labReports.filter(report => report.labOrder !== null)
      : labReports;

  res.status(200).json({
    status: 'success',
    results: filteredReports.length,
    data: {
      labReports: filteredReports
    }
  });
});