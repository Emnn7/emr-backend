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
// Helper to validate payment type
const validatePaymentType = (paymentType) => {
  const validTypes = ['registration', 'procedure', 'lab-test', 'other'];
  return validTypes.includes(paymentType);
};

// Helper to generate receipt numbers
const generateReceiptNumber = async () => {
  const count = await Payment.countDocuments();
  return `REC-${Date.now()}-${count + 1}`;
};

// Helper to generate patient card number
// Matches your model's format: "PC" + 6 digits
const generateCardNumber = () => {
  return 'PC' + Date.now().toString().slice(-6); // Same as your model default
};

// Helper to calculate amounts
const calculatePaymentAmounts = (services, discount = 0, taxAmount = 0) => {
  const subtotal = services.reduce((sum, service) => sum + service.amount, 0);
  const total = subtotal - discount + taxAmount;
  return { subtotal, total };
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
  // Validate payment type
  if (!validatePaymentType(req.body.paymentType)) {
    return next(new AppError('Invalid payment type specified', 400));
  }

  // Generate receipt number
  const receiptNumber = await generateReceiptNumber();

  // Initialize variables
  let billing;
  let patient;

  // Handle registration payments
  if (req.body.paymentType === 'registration') {
    patient = await Patient.findById(req.body.patient);
    if (!patient) {
      return next(new AppError('No patient found with that ID', 404));
    }

    // Create registration billing record
    billing = await Billing.create({
      patient: patient._id,
      items: [{
        description: 'Registration Fee',
        quantity: 1,
        unitPrice: 100,
        total: 100
      }],
      subtotal: 100,
      total: 100,
      status: 'pending',
      paymentType: 'registration',
      createdBy: req.user._id,
      createdByModel: capitalizeFirstLetter(req.user.role)
    });

    // Generate and assign card number
    patient.patientCardNumber = 'PC' + Date.now().toString().slice(-6);
    await patient.save({ validateBeforeSave: false });
  } 
  // Handle regular payments with billing reference
  else if (req.body.billing) {
    billing = await Billing.findById(req.body.billing);
    if (!billing) {
      return next(new AppError('No billing found with that ID', 404));
    }
  }

  // Calculate amounts
  const amount = req.body.amountReceived || (billing ? billing.total : 100);
  const subtotal = billing ? billing.subtotal : amount;
  const total = amount;

  // Prepare payment data
  const paymentData = {
    ...req.body,
    receiptNumber,
    amount,
    subtotal,
    totalAmount: total,
    billing: billing ? billing._id : undefined,
    processedBy: req.user._id,
    processedByModel: capitalizeFirstLetter(req.user.role)
  };

  // Create payment
  const newPayment = await Payment.create(paymentData);

  // Update billing status if applicable
  if (billing) {
    billing.status = 'paid';
    await billing.save();
  }

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'payment',
    entityId: newPayment._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    metadata: {
      amount: newPayment.totalAmount,
      paymentMethod: newPayment.paymentMethod,
      ...(billing && { billingId: billing._id })
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      payment: {
        _id: newPayment._id,
        receiptNumber: newPayment.receiptNumber,
        amount: newPayment.amount,
        paymentMethod: newPayment.paymentMethod,
        paymentType: newPayment.paymentType,
        // Include other relevant fields
      },
      cardNumber: req.body.paymentType === 'registration' ? patient.patientCardNumber : undefined
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
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('patient', 'firstName lastName phone address')
      .populate({
        path: 'billing',
        populate: {
          path: 'services',
          model: 'BillingItem'
        }
      })
      .populate('processedBy', 'firstName lastName');

    if (!payment) {
      return next(new AppError('No payment found with that ID', 404));
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
      services: payment.billing?.services?.map(s => ({
        description: s.description || 'Service',
        amount: s.amount || 0
      })) || [{ 
        description: 'Registration Fee', 
        amount: payment.amount 
      }],
      subtotal: payment.subtotal,
      discount: payment.discount || 0,
      taxAmount: payment.taxAmount || 0,
      total: payment.totalAmount
    };

    const receiptPath = await pdfService.generateReceipt(receiptData);
    
    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNumber}.pdf`);
    
    // Stream the file
    const fileStream = fs.createReadStream(receiptPath);
    fileStream.pipe(res);
    
    // Delete the file after streaming
    fileStream.on('close', () => {
      fs.unlink(receiptPath, (err) => {
        if (err) console.error('Error deleting temp receipt:', err);
      });
    });

  } catch (err) {
    console.error('Receipt generation failed:', err);
    return next(new AppError('Failed to generate receipt PDF', 500));
  }
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

// @desc    Create billing from procedure
// @route   POST /api/v1/billings/from-procedure/:procedureId
// @access  Private/Admin, Receptionist
exports.createBillingFromProcedure = catchAsync(async (req, res, next) => {
  const procedure = await PatientProcedure.findById(req.params.procedureId);
  if (!procedure) {
    return next(new AppError('No procedure found with that ID', 404));
  }

  // Create billing data from procedure
  const billingData = {
    patient: procedure.patient,
    services: procedure.procedures.map(p => ({
      code: p.procedure.code,
      description: p.procedure.description,
      amount: p.procedure.price * p.quantity
    })),
    total: procedure.procedures.reduce((sum, p) => sum + (p.procedure.price * p.quantity), 0),
    status: 'pending'
  };

  const billing = await Billing.create(billingData);

  // Update procedure status
  procedure.status = 'billed';
  await procedure.save();

  res.status(201).json({
    status: 'success',
    data: {
      billing
    }
  });
});
// @desc    Get available payment types and methods
// @route   GET /api/v1/payments/types
// @access  Private/Admin, Receptionist
exports.getPaymentTypes = catchAsync(async (req, res, next) => {
  const paymentTypes = [
    {
      type: 'registration',
      label: 'Registration Fee',
      description: 'Initial patient registration payment',
      defaultAmount: 100 // Set your default registration fee
    },
    {
      type: 'procedure',
      label: 'Medical Procedure',
      description: 'Payment for medical procedures performed',
      defaultAmount: 0 // Will be calculated based on procedures
    },
    {
      type: 'lab-test',
      label: 'Lab Test',
      description: 'Payment for laboratory tests',
      defaultAmount: 0 // Will be calculated based on tests
    },
    {
      type: 'other',
      label: 'Other Service',
      description: 'Payment for other medical services',
      defaultAmount: 0
    }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'bank-transfer', label: 'Bank Transfer' },
    { value: 'mobile-money', label: 'Mobile Money' }
  ];

  res.status(200).json({
    status: 'success',
    data: {
      paymentTypes,
      paymentMethods
    }
  });
});

exports.getUnpaidBills = catchAsync(async (req, res, next) => {
  const bills = await Billing.find({ status: { $ne: 'paid' } })
    .populate('patient', 'firstName lastName')
    .populate({
      path: 'relatedEntity',
      select: 'code description procedures',
      populate: {
        path: 'procedures.procedure',
        select: 'code description price'
      }
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: bills.length,
    data: {
      bills
    }
  });
});

exports.updatePaymentStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }

  // Update corresponding billing status if exists
  if (payment.billing) {
    await Billing.findByIdAndUpdate(payment.billing, { status });
  }

  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });
});

exports.markBillAsPaid = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Find the billing record
  const billing = await Billing.findById(id);
  if (!billing) {
    return next(new AppError('No billing found with that ID', 404));
  }

  // Create the payment record
  const payment = await Payment.create({
    billing: billing._id,
    patient: billing.patient,
    amount: billing.total,
    paymentMethod: 'cash', // or get from request
    status: 'completed',
    paymentType: billing.paymentType,
    relatedEntity: billing.relatedEntity || billing.patient,
    relatedEntityModel: billing.paymentType === 'registration' ? 'Patient' : 
                       billing.paymentType === 'procedure' ? 'PatientProcedure' : 'LabTest',
    processedBy: req.user._id,
    processedByModel: capitalizeFirstLetter(req.user.role)
  });

  // Update billing status
  billing.status = 'paid';
  await billing.save();

  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });
});