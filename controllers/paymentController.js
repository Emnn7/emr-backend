const Payment = require('../models/Payment');
const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const pdfService = require('../services/pdfService');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Get all payments
// @route   GET /api/v1/payments
// @access  Private/Admin, Receptionist
exports.getAllPayments = catchAsync(async (req, res, next) => {
  // Filtering
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

  let query = Payment.find(JSON.parse(queryStr))
    .populate('patient', 'firstName lastName phone')
    .populate('billing', 'total status')
    .populate('processedBy', 'firstName lastName');

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const payments = await query;

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private/Admin, Receptionist
exports.getPaymentStats = catchAsync(async (req, res, next) => {
  const stats = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        paymentDate: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        avgPayment: { $avg: '$totalAmount' },
        minPayment: { $min: '$totalAmount' },
        maxPayment: { $max: '$totalAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        avgPayment: 1,
        minPayment: 1,
        maxPayment: 1,
        count: 1
      }
    }
  ]);

  const dailyStats = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        paymentDate: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 7))
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const paymentMethodsStats = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        paymentDate: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    },
    {
      $group: {
        _id: '$paymentMethod',
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats[0] || {},
      dailyStats,
      paymentMethodsStats
    }
  });
});

// @desc    Get today's payments
// @route   GET /api/v1/payments/today
// @access  Private/Admin, Receptionist
exports.getTodaysPayments = catchAsync(async (req, res, next) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const payments = await Payment.find({
    paymentDate: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: 'completed'
  })
  .populate('patient', 'firstName lastName phone')
  .populate('billing', 'total status')
  .sort('-paymentDate');

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

// @desc    Get a single payment
// @route   GET /api/v1/payments/:id
// @access  Private
exports.getPayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('patient', 'firstName lastName phone address')
    .populate('billing', 'total status services')
    .populate('processedBy', 'firstName lastName');

  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    payment.patient._id.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('You are not authorized to view this payment', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });
});

// @desc    Create a new payment
// @route   POST /api/v1/payments
// @access  Private/Admin, Receptionist
exports.createPayment = catchAsync(async (req, res, next) => {
  // Validate services array
  if (!req.body.services || !Array.isArray(req.body.services) || req.body.services.length === 0) {
    return next(new AppError('Please provide at least one service', 400));
  }

  // Check if billing exists
  const billing = await Billing.findById(req.body.billing);
  if (!billing) {
    return next(new AppError('No billing found with that ID', 404));
  }

  // Check if patient exists
  const patient = await Patient.findById(req.body.patient);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Verify patient matches billing patient
  if (billing.patient.toString() !== req.body.patient) {
    return next(new AppError('The patient does not match the billing patient', 400));
  }

  // Calculate totals
  const subtotal = req.body.services.reduce((sum, service) => sum + service.amount, 0);
  const discount = req.body.discount || 0;
  const taxAmount = req.body.taxAmount || 0;
  const totalAmount = subtotal - discount + taxAmount;

  // Set the processedBy to the current user
  const paymentData = {
    ...req.body,
    patient: req.body.patient,
    billing: req.body.billing,
    subtotal,
    discount,
    taxAmount,
    totalAmount,
    processedBy: req.user._id,
    processedByModel: req.user.role,
    status: 'completed' // Default to completed for manual payments
  };

  const newPayment = await Payment.create(paymentData);

  // Update billing status
  const totalPayments = await Payment.aggregate([
    { $match: { billing: billing._id } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  const totalPaid = totalPayments.length > 0 ? totalPayments[0].total : 0;
  if (totalPaid >= billing.total) {
    billing.status = 'paid';
    await billing.save();
  } else if (totalPaid > 0) {
    billing.status = 'partially-paid';
    await billing.save();
  }

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'payment',
    entityId: newPayment._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      amount: newPayment.totalAmount,
      paymentMethod: newPayment.paymentMethod
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      payment: newPayment
    }
  });
});

// @desc    Update a payment
// @route   PATCH /api/v1/payments/:id
// @access  Private/Admin, Receptionist
exports.updatePayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }

  // Prevent updating certain fields
  if (req.body.patient || req.body.billing || req.body.processedBy || req.body.processedByModel) {
    return next(
      new AppError('You cannot change patient, billing or processor information', 400)
    );
  }

  // Calculate new totals if services are updated
  if (req.body.services) {
    const subtotal = req.body.services.reduce((sum, service) => sum + service.amount, 0);
    const discount = req.body.discount || payment.discount;
    const taxAmount = req.body.taxAmount || payment.taxAmount;
    req.body.totalAmount = subtotal - discount + taxAmount;
    req.body.subtotal = subtotal;
  }

  const updatedPayment = await Payment.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  // Update billing status if amount changed
  if (req.body.amount || req.body.services) {
    const billing = await Billing.findById(payment.billing);
    const totalPayments = await Payment.aggregate([
      { $match: { billing: billing._id } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const totalPaid = totalPayments.length > 0 ? totalPayments[0].total : 0;
    if (totalPaid >= billing.total) {
      billing.status = 'paid';
      await billing.save();
    } else if (totalPaid > 0) {
      billing.status = 'partially-paid';
      await billing.save();
    } else {
      billing.status = 'pending';
      await billing.save();
    }
  }

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'payment',
    entityId: updatedPayment._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      payment: updatedPayment
    }
  });
});

// @desc    Delete a payment
// @route   DELETE /api/v1/payments/:id
// @access  Private/Admin
exports.deletePayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }

  // Get billing before deleting payment
  const billing = await Billing.findById(payment.billing);

  await Payment.findByIdAndDelete(req.params.id);

  // Update billing status
  if (billing) {
    const totalPayments = await Payment.aggregate([
      { $match: { billing: billing._id } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const totalPaid = totalPayments.length > 0 ? totalPayments[0].total : 0;
    if (totalPaid >= billing.total) {
      billing.status = 'paid';
      await billing.save();
    } else if (totalPaid > 0) {
      billing.status = 'partially-paid';
      await billing.save();
    } else {
      billing.status = 'pending';
      await billing.save();
    }
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'payment',
    entityId: req.params.id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      amount: payment.totalAmount,
      paymentMethod: payment.paymentMethod
    }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Generate payment receipt PDF
// @route   GET /api/v1/payments/:id/receipt
// @access  Private
exports.generateReceipt = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('patient', 'firstName lastName phone address')
    .populate('billing', 'total services')
    .populate('processedBy', 'firstName lastName');

  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    payment.patient._id.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('You are not authorized to view this receipt', 403));
  }

  // Prepare receipt data
  const receiptData = {
    receiptNumber: payment.receiptNumber,
    date: payment.paymentDate,
    patient: {
      name: `${payment.patient.firstName} ${payment.patient.lastName}`,
      phone: payment.patient.phone,
      address: payment.patient.address
    },
    services: payment.billing.services.map(service => ({
      description: service.description,
      amount: service.amount
    })),
    subtotal: payment.subtotal,
    discount: payment.discount,
    taxAmount: payment.taxAmount,
    total: payment.totalAmount,
    paymentMethod: payment.paymentMethod,
    processedBy: payment.processedBy ? 
      `${payment.processedBy.firstName} ${payment.processedBy.lastName}` : 'System'
  };

  // Generate PDF
  const receiptPath = await pdfService.generateReceipt(receiptData);

  // Log the action
  await AuditLog.create({
    action: 'read',
    entity: 'payment',
    entityId: payment._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.download(receiptPath, `receipt-${payment.receiptNumber}.pdf`);
});

// @desc    Get payments by patient
// @route   GET /api/v1/payments/patient/:patientId
// @access  Private
exports.getPaymentsByPatient = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    req.params.patientId !== req.user._id.toString()
  ) {
    return next(new AppError('You are not authorized to view these payments', 403));
  }

  const payments = await Payment.find({ patient: req.params.patientId })
    .populate('patient', 'firstName lastName phone')
    .populate('billing', 'total status')
    .sort('-paymentDate');

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

// @desc    Get payments by status
// @route   GET /api/v1/payments/status/:status
// @access  Private/Admin, Receptionist
exports.getPaymentsByStatus = catchAsync(async (req, res, next) => {
  const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
  if (!validStatuses.includes(req.params.status)) {
    return next(new AppError('Invalid status specified', 400));
  }

  const payments = await Payment.find({ status: req.params.status })
    .populate('patient', 'firstName lastName phone')
    .populate('billing', 'total status')
    .sort('-paymentDate');

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

// @desc    Get payments by billing
// @route   GET /api/v1/payments/billing/:billingId
// @access  Private/Admin, Receptionist
exports.getPaymentsByBilling = catchAsync(async (req, res, next) => {
  // Check if billing exists
  const billing = await Billing.findById(req.params.billingId);
  if (!billing) {
    return next(new AppError('No billing found with that ID', 404));
  }

  const payments = await Payment.find({ billing: req.params.billingId })
    .populate('patient', 'firstName lastName phone')
    .populate('billing', 'total status')
    .sort('-paymentDate');

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});