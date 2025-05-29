const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
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

// @desc    Get all prescriptions
// @route   GET /api/v1/prescriptions
// @access  Private/Doctor, Admin
exports.getAllPrescriptions = catchAsync(async (req, res, next) => {
  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = Prescription.find({ doctor: req.user._id });
  } else {
    query = Prescription.find();
  }

  const prescriptions = await query
    .populate('patient', 'firstName lastName phone gender')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: prescriptions.length,
    data: {
      prescriptions
    }
  });
});

// @desc    Get a single prescription
// @route   GET /api/v1/prescriptions/:id
// @access  Private
exports.getPrescription = catchAsync(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization');

  if (!prescription) {
    return next(new AppError('No prescription found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    prescription.doctor._id.toString() !== req.user._id.toString() &&
    prescription.patient._id.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view this prescription', 403)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      prescription
    }
  });
});

// @desc    Create a new prescription
// @route   POST /api/v1/prescriptions
// @access  Private/Doctor, Admin
exports.createPrescription = catchAsync(async (req, res, next) => {
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

  // Set the doctor to the current user if not admin
  if (req.user.role === ROLES.DOCTOR) {
    req.body.doctor = req.user._id;
  }

  // Check if doctor exists
  const doctor = await Doctor.findById(req.body.doctor);
  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  // Validate medications
  if (!req.body.medications || req.body.medications.length === 0) {
    return next(new AppError('Please provide at least one medication', 400));
  }

  const newPrescription = await Prescription.create(req.body);

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'prescription',
    entityId: newPrescription._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    status: 'success',
    data: {
      prescription: newPrescription
    }
  });
});

// @desc    Update a prescription
// @route   PATCH /api/v1/prescriptions/:id
// @access  Private/Doctor, Admin
exports.updatePrescription = catchAsync(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    return next(new AppError('No prescription found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    prescription.doctor.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to update this prescription', 403)
    );
  }

  // Prevent updating certain fields
  if (req.body.patient || req.body.doctor) {
    return next(
      new AppError('You cannot change patient or doctor information', 400)
    );
  }

  const updatedPrescription = await Prescription.findByIdAndUpdate(
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
    entity: 'prescription',
    entityId: updatedPrescription._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      prescription: updatedPrescription
    }
  });
});

// @desc    Delete a prescription
// @route   DELETE /api/v1/prescriptions/:id
// @access  Private/Admin
exports.deletePrescription = catchAsync(async (req, res, next) => {
  const prescription = await Prescription.findByIdAndDelete(req.params.id);

  if (!prescription) {
    return next(new AppError('No prescription found with that ID', 404));
  }

  // Check permissions
  if (req.user.role !== ROLES.ADMIN) {
    return next(
      new AppError('You are not authorized to delete this prescription', 403)
    );
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'prescription',
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

// @desc    Generate prescription PDF
// @route   GET /api/v1/prescriptions/:id/pdf
// @access  Private/Doctor, Admin, Patient
exports.generatePrescriptionPDF = catchAsync(async (req, res, next) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'firstName lastName phone dateOfBirth gender')
    .populate('doctor', 'firstName lastName specialization licenseNumber');

  if (!prescription) {
    return next(new AppError('No prescription found with that ID', 404));
  }

  console.log('Prescription:', prescription);  // Log the entire prescription object to see the structure
console.log('Patient:', prescription.patient);  // Log the patient details
console.log('Doctor:', prescription.doctor);  // Log the doctor details


  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    prescription.doctor._id.toString() !== req.user._id.toString() &&
    prescription.patient._id.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view this prescription', 403)
    );
  }

  // Generate PDF
  const prescriptionPath = await pdfService.generatePrescription(prescription);

  // Log the action
  await AuditLog.create({
    action: 'read',
    entity: 'prescription',
    entityId: prescription._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.download(prescriptionPath);
});

// @desc    Get prescriptions by patient
// @route   GET /api/v1/prescriptions/patient/:patientId
// @access  Private/Doctor, Admin, Patient
exports.getPrescriptionsByPatient = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions if the requester is the patient
  if (
    req.user.role === ROLES.PATIENT &&
    req.params.patientId !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view these prescriptions', 403)
    );
  }

  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = Prescription.find({
      patient: req.params.patientId,
      doctor: req.user._id
    });
  } else {
    query = Prescription.find({ patient: req.params.patientId });
  }

  const prescriptions = await query
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: prescriptions.length,
    data: {
      prescriptions
    }
  });
});

// @desc    Get prescriptions by status
// @route   GET /api/v1/prescriptions/status/:status
// @access  Private/Doctor, Admin
exports.getPrescriptionsByStatus = catchAsync(async (req, res, next) => {
  const validStatuses = ['active', 'completed', 'cancelled'];
  if (!validStatuses.includes(req.params.status)) {
    return next(new AppError('Invalid status specified', 400));
  }

  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = Prescription.find({
      status: req.params.status,
      doctor: req.user._id
    });
  } else {
    query = Prescription.find({ status: req.params.status });
  }

  const prescriptions = await query
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: prescriptions.length,
    data: {
      prescriptions
    }
  });
});


exports.getPrescriptionsByDoctor = catchAsync(async (req, res, next) => {
  const prescriptions = await Prescription.find({ doctor: req.params.doctorId })
    .populate('patient', 'firstName lastName phone gender')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: prescriptions.length,
    data: {
      prescriptions
    }
  });
});