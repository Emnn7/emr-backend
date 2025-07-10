const mongoose = require('mongoose');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Billing = require('../models/Billing');
const Appointment = require('../models/Appointment');
const LabReport = require('../models/LabReport');
const LabAssistant = require('../models/LabAssistant');
const Payment = require('../models/Payment');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');
const Notification = require('../models/Notification');
const LabTestCatalog = require('../models/LabTestCatalog');

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
    console.log('Filtering lab orders for doctor:', req.user._id); // Add logging
    query = LabOrder.find({ doctor: req.user._id });
  } else if (req.user.role === ROLES.LAB_ASSISTANT) {
    query = LabOrder.find();
  } else {
    query = LabOrder.find();
  }

    const labOrders = await query
    .populate('patient', 'firstName lastName phone patientCardNumber')
    .populate('doctor', 'firstName lastName specialization')
    .populate({
      path: 'report',
      populate: {
        path: 'patient performedBy verifiedBy',
        select: 'firstName lastName'
      }
    })
    .sort('-createdAt');

  console.log('Found lab orders:', labOrders); // Add logging

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
// In labOrderController.js - update getLabOrder function
exports.getLabOrder = catchAsync(async (req, res, next) => {
   // Validate the ID parameter first
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError('Invalid lab order ID', 400));
  }
  const labOrder = await LabOrder.findById(req.params.id)
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization')
    .populate({
      path: 'report',
      populate: [
        {
          path: 'patient',
          select: 'firstName lastName phone'
        },
        {
          path: 'labOrder',
          populate: {
            path: 'doctor',
            select: 'firstName lastName specialization'
          }
        }
      ]
    })
    .populate('tests')
    .populate('billing');

  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.LAB_ASSISTANT &&
    req.user.role !== ROLES.RECEPTIONIST &&

    labOrder.doctor._id.toString() !== req.user._id.toString()
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
  // Get patient ID from body
  const { patient } = req.body;

  // Validate patient ID exists
  if (!patient) {
    return next(new AppError('Patient ID is required', 400));
  }

  // Validate patient ID format
  if (!mongoose.Types.ObjectId.isValid(patient)) {
    return next(new AppError('Invalid patient ID format', 400));
  }

   // Get the full patient document
  const patientDoc = await Patient.findById(patient);
  if (!patientDoc) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check if patient exists
  const patientExists = await Patient.findById(patient);
  if (!patientExists) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Validate tests
  if (!req.body.tests || req.body.tests.length === 0) {
    return next(new AppError('Please provide at least one test', 400));
  }

  // Set patient ID
  req.body.patient = patient;

  // Validate appointment if provided
  if (req.body.appointment) {
    const appointment = await Appointment.findById(req.body.appointment);
    if (!appointment) {
      return next(new AppError('No appointment found with that ID', 404));
    }
  }

  // Set doctor to current user if not admin
  if (req.user.role === ROLES.DOCTOR) {
    req.body.doctor = req.user._id;
  }

  // Validate doctor exists
  const doctor = await Doctor.findById(req.body.doctor);
  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  // Validate tests
  if (!req.body.tests || req.body.tests.length === 0) {
    return next(new AppError('Please provide at least one test', 400));
  }


  // Get test details from catalog including prices
  const testsWithDetails = await Promise.all(
    req.body.tests.map(async (test) => {
      const catalogTest = await LabTestCatalog.findById(test.testId);
      if (!catalogTest) {
        throw new AppError(`Test with ID ${test.testId} not found in catalog`, 404);
      }
      
      return {
        testId: test.testId,
        name: catalogTest.name,
        code: catalogTest.code,
        price: catalogTest.price,
        quantity: test.quantity || 1,
        status: 'pending'
      };
    })
  );

  // Replace tests array with enriched data
  req.body.tests = testsWithDetails;

  // Calculate total amount for billing reference
  const totalAmount = testsWithDetails.reduce(
    (sum, test) => sum + (test.price * (test.quantity || 1)),
    0
  );

  // Create the lab order
const newLabOrder = await LabOrder.create({
  ...req.body,
  status: 'pending-payment',  // Must be exactly this
  paymentVerified: false,     // Explicitly false
  paymentStatus: 'pending'    // Explicit initial state
});
  // Create billing record
    const billing = await Billing.create({
    patient: patientDoc._id,  // Use the patient document's ID
    items: testsWithDetails.map(test => ({
      description: test.name,
      quantity: test.quantity || 1,
      unitPrice: test.price,
      total: test.price * (test.quantity || 1)
    })),
    subtotal: totalAmount,
    total: totalAmount,
    status: 'pending',
    paymentType: 'lab-test',
    relatedLabOrder: newLabOrder._id,
    createdBy: req.user._id,
    createdByModel: capitalizeFirstLetter(req.user.role)
  });

  // Update lab order with billing reference
  newLabOrder.billing = billing._id;
  await newLabOrder.save();

  // Notify lab assistants
  const labAssistants = await LabAssistant.find();
  await Notification.insertMany(
    labAssistants.map(assistant => ({
      recipient: assistant._id,
      sender: req.user._id,
      type: 'new-lab-order',
      message: `New lab order for ${patient.firstName} ${patient.lastName}`,
      relatedEntity: 'LabOrder',
      relatedEntityId: newLabOrder._id,
      status: 'unread',
      senderModel: 'Doctor',
      recipientModel: 'LabAssistant'
    }))
  );

  // Audit log
  await AuditLog.create({
    action: 'create',
    entity: 'labOrder',
    entityId: newLabOrder._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    status: 'success',
    data: {
      labOrder: newLabOrder,
      billing
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
    labOrder.doctor.toString() !== req.user._id.toString()
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
    user: req.user._id,
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
      doctor: req.user._id
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
      doctor: req.user._id
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

exports.getLabOrdersByStatus = catchAsync(async (req, res, next) => {
  const { status } = req.params;
  const orders = await LabOrder.find({ status })
    .populate('patient', 'firstName lastName')
    .populate('doctor', 'firstName lastName')
    .populate('tests')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders }
  });
});

// Update order status
exports.updateLabOrderStatus = catchAsync(async (req, res, next) => {
  const order = await LabOrder.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );

  if (!order) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

exports.getPendingLabOrders = catchAsync(async (req, res) => {
  const orders = await LabOrder.find({ 
    status: 'pending-payment'
  })
  .populate('patient', 'firstName lastName phone')
  .populate({
    path: 'tests',
    select: 'name price'
  });
  
  // Format response consistently
  const formattedOrders = orders.map(order => ({
    ...order.toObject(),
    status: order.status || 'pending-payment',
    patient: order.patient || {},
    tests: order.tests || []
  }));

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      labOrders: formattedOrders
    }
  });
});


exports.updatePaymentStatus = catchAsync(async (req, res, next) => {
  const labOrder = await LabOrder.findById(req.params.id);
  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  const billing = await Billing.findById(labOrder.billing);
  if (!billing) {
    return next(new AppError('Billing not found for this order', 400));
  }

  // Ensure payment method is provided
  if (!req.body.paymentMethod) {
    return next(new AppError('Payment method is required', 400));
  }

  const services = (billing.items || []).map((item, i) => ({
    code: `SVC-${i + 1}`,
    description: item.description,
    amount: item.total
  }));

  // Create Payment
  const newPayment = await Payment.create({
    billing: billing._id,
    patient: labOrder.patient,
    amount: billing.total,
    paymentMethod: req.body.paymentMethod, // This was missing proper validation
    paymentType: 'lab-test',
    relatedLabOrder: labOrder._id,
    labOrder: labOrder._id,
    processedBy: req.user._id,
    processedByModel: 'Receptionist',
    services: services   
  });

  // Update LabOrder
  const updatedOrder = await LabOrder.findByIdAndUpdate(
    req.params.id,
    {
      status: 'paid',
      paymentStatus: 'paid',
      paymentVerified: true,
      payment: newPayment._id
    },
    { new: true, runValidators: true }
  ).populate('patient tests');

  // Notify lab assistants
  const labAssistants = await LabAssistant.find();
  await Notification.insertMany(
    labAssistants.map(assistant => ({
      recipient: assistant._id,
      sender: req.user._id,
      type: 'lab-order-paid',
      message: `Lab order #${labOrder._id} has been paid and is ready for processing`,
      relatedEntity: 'LabOrder',
      relatedEntityId: labOrder._id,
      status: 'unread',
      senderModel: 'Receptionist',
      recipientModel: 'LabAssistant'
    }))
  );

  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder
    }
  });
});


exports.createLabOrderBilling = catchAsync(async (req, res, next) => {
  const labOrder = await LabOrder.findById(req.params.id)
    .populate('patient')
    .populate({
      path: 'tests',
      select: 'name price' // Make sure to include price
    });

  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  if (labOrder.billing) {
    return next(new AppError('Billing already exists for this lab order', 400));
  }

  // Validate tests have prices
  if (!labOrder.tests || labOrder.tests.some(test => !test.price)) {
    return next(new AppError('One or more tests are missing price information', 400));
  }

  // Create billing items with proper pricing
  const billingItems = labOrder.tests.map(test => ({
    description: test.name,
    quantity: 1,
    unitPrice: test.price,
    total: test.price * 1 // quantity is 1
  }));

  const subtotal = billingItems.reduce((sum, item) => sum + item.total, 0);

  const billing = await Billing.create({
    patient: labOrder.patient._id,
    items: billingItems,
    subtotal,
    total: subtotal, // Assuming no taxes or discounts
    status: 'pending',
    paymentType: 'lab-test',
    relatedLabOrder: labOrder._id,
    createdBy: req.user._id,
    createdByModel: capitalizeFirstLetter(req.user.role)
  });

  // Update lab order
  labOrder.billing = billing._id;
  labOrder.status = 'pending-payment';
  await labOrder.save();

  res.status(201).json({
    status: 'success',
    data: {
      billing
    }
  });
});

exports.getPendingPaymentOrders = catchAsync(async (req, res, next) => {
  const query = {
    status: 'pending-payment',
    paymentVerified: { $ne: true },
    // createdAt: { $gte: new Date('2023-01-01') } // Temporarily widen date range
  };

  console.log('Executing query:', JSON.stringify(query, null, 2));
  
  const orders = await LabOrder.find(query)
    .populate({
      path: 'patient',
      select: 'firstName lastName'
    })
    .populate({
      path: 'tests',
      select: 'name price'
    })
    .lean();

  console.log('Raw orders from DB:', orders.slice(0, 1)); // Log first order
  
  if (orders.length === 0) {
    console.warn('No orders found matching query. Sample document in DB:', 
      await LabOrder.findOne().lean());
  }

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { labOrders: orders }
  });
});

exports.getPaidLabOrders = catchAsync(async (req, res) => {
  const orders = await LabOrder.find({
    status: 'paid',
    paymentVerified: true
  })
  .populate('patient doctor tests')
  .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { labOrders: orders }
  });
});