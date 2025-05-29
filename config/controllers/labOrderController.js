const mongoose = require('mongoose');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const LabReport = require('../models/LabReport');
const LabAssistant = require('../models/LabAssistant');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');
const Notification = require('../models/Notification');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Get all lab orders
// @route   GET /api/v1/lab-orders
// @access  Private/Doctor, LabAssistant, Admin
exports.getAllLabOrders = catchAsync(async (req, res, next) => {
  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = LabOrder.find({ doctor: req.user.id });
  } else if (req.user.role === ROLES.LAB_ASSISTANT) {
    query = LabOrder.find();
  } else {
    query = LabOrder.find();
  }

  const labOrders = await query
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: labOrders.length,
    data: {
      labOrders
    }
  });
});

// @desc    Get a single lab order
// @route   GET /api/v1/lab-orders/:id
// @access  Private/Doctor, LabAssistant, Admin
exports.getLabOrder = catchAsync(async (req, res, next) => {
  const labOrder = await LabOrder.findById(req.params.id)
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization');

  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.LAB_ASSISTANT &&
    labOrder.doctor._id.toString() !== req.user.id.toString()
  ) {
    return next(
      new AppError('You are not authorized to view this lab order', 403)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      labOrder
    }
  });
});

// @desc    Create a new lab order
// @route   POST /api/lab-orders
// @access  Private/Doctor, Admin
exports.createLabOrder = catchAsync(async (req, res, next) => {
  const patientId = req.params.patientId;  // Get the patient ID from the URL

  // Log the patient ID to verify
  console.log('Received patient ID:', patientId);

  // Check if the patient ID is valid
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return next(new AppError('Invalid patient ID', 400));
  }

  // Check if patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Set the patient ID in the request body to be saved
  req.body.patient = patientId;

  // Check if appointment exists if provided
  if (req.body.appointment) {
    const appointment = await Appointment.findById(req.body.appointment);
    if (!appointment) {
      return next(new AppError('No appointment found with that ID', 404));
    }
  }

  // Set the doctor to the current user if not admin
  if (req.user.role === ROLES.DOCTOR) {
    req.body.doctor = req.user.id;
  }

  // Check if doctor exists
  const doctor = await Doctor.findById(req.body.doctor);
  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  // Validate tests
  if (!req.body.tests || req.body.tests.length === 0) {
    return next(new AppError('Please provide at least one test', 400));
  }

  // Create the new lab order
  const newLabOrder = await LabOrder.create(req.body);

  // Example: Assuming lab assistants are stored in the LabAssistant model
  const labAssistants = await LabAssistant.find(); // Fetch all lab assistants (or apply filters as needed)
  const labAssistantIds = labAssistants.map(assistant => assistant._id); // Extract their IDs

  // Create a notification for each lab assistant
  const notifications = labAssistantIds.map(async (recipientId) => {
    return Notification.create({
      recipient: recipientId,  // Assigning the ObjectId of lab assistants
      sender: req.user.id,
      type: 'new-lab-order',
      message: `New lab order for ${patient.firstName} ${patient.lastName}`,
      relatedEntity: 'LabOrder',
      relatedEntityId: newLabOrder._id,
      status: 'unread',
      senderModel: 'Doctor', // Sender model could be Doctor or whatever the sender is
      recipientModel: 'LabAssistant' // Recipient model is LabAssistant
    });
  });

  await Promise.all(notifications); // Wait for all notifications to be created

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'labOrder',
    entityId: newLabOrder._id,
    user: req.user.id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Respond with the created lab order
  res.status(201).json({
    status: 'success',
    data: {
      labOrder: newLabOrder
    }
  });
});


// @desc    Update a lab order
// @route   PATCH /api/v1/lab-orders/:id
// @access  Private/Doctor, Admin
exports.updateLabOrder = catchAsync(async (req, res, next) => {
  req.body.patient = req.params.patientId;
  const labOrder = await LabOrder.findById(req.params.id);
  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    labOrder.doctor.toString() !== req.user.id.toString()
  ) {
    return next(
      new AppError('You are not authorized to update this lab order', 403)
    );
  }

  // Prevent updating certain fields
  if (req.body.patient || req.body.doctor) {
    return next(
      new AppError('You cannot change patient or doctor information', 400)
    );
  }

  const updatedLabOrder = await LabOrder.findByIdAndUpdate(
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
    entity: 'labOrder',
    entityId: updatedLabOrder._id,
    user: req.user.id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      labOrder: updatedLabOrder
    }
  });
});

// @desc    Delete a lab order
// @route   DELETE /api/v1/lab-orders/:id
// @access  Private/Admin
exports.deleteLabOrder = catchAsync(async (req, res, next) => {
  const labOrder = await LabOrder.findByIdAndDelete(req.params.id);

  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  // Check permissions
  if (req.user.role !== ROLES.ADMIN) {
    return next(
      new AppError('You are not authorized to delete this lab order', 403)
    );
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'labOrder',
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

// @desc    Get lab orders by patient
// @route   GET /api/v1/lab-orders/patient/:patientId
// @access  Private/Doctor, LabAssistant, Admin
exports.getLabOrdersByPatient = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = LabOrder.find({
      patient: req.params.patientId,
      doctor: req.user.id
    });
  } else {
    query = LabOrder.find({ patient: req.params.patientId });
  }

  const labOrders = await query
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: labOrders.length,
    data: {
      labOrders
    }
  });
});

// @desc    Get lab orders by status
// @route   GET /api/v1/lab-orders/status/:status
// @access  Private/Doctor, LabAssistant, Admin
exports.getLabOrdersByStatus = catchAsync(async (req, res, next) => {
  const validStatuses = ['pending', 'completed', 'cancelled'];
  if (!validStatuses.includes(req.params.status)) {
    return next(new AppError('Invalid status specified', 400));
  }

  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    query = LabOrder.find({
      status: req.params.status,
      doctor: req.user.id
    });
  } else {
    query = LabOrder.find({ status: req.params.status });
  }

  const labOrders = await query
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: labOrders.length,
    data: {
      labOrders
    }
  });
});

exports.getLabOrdersByDoctor = catchAsync(async (req, res, next) => {
  const labOrders = await LabOrder.find({ doctor: req.params.doctorId })
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: labOrders.length,
    data: {
      labOrders
    }
  });
});