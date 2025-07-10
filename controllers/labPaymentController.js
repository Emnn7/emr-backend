const LabOrder = require('../models/LabOrder');
const Billing = require('../models/Billing');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Add this at the top of labPaymentController.js
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Create billing for lab order
// @route   POST /api/v1/lab-orders/:id/create-billing
// @access  Private/Doctor
exports.createLabOrderBilling = catchAsync(async (req, res, next) => {
  const labOrder = await LabOrder.findById(req.params.id);
  
  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  // Check if billing already exists
  const existingBilling = await Billing.findOne({ relatedLabOrder: labOrder._id });
  if (existingBilling) {
    return next(new AppError('Billing already exists for this lab order', 400));
  }

  // Calculate total from lab tests
  const total = labOrder.tests.reduce((sum, test) => sum + (test.price * test.quantity), 0);

  const billing = await Billing.create({
    patient: labOrder.patient,
    items: labOrder.tests.map(test => ({
      description: test.name,
      quantity: test.quantity,
      unitPrice: test.price,
      total: test.price * test.quantity
    })),
    subtotal: total,
    total,
    status: 'pending',
    paymentType: 'lab-test',
    relatedLabOrder: labOrder._id,
    createdBy: req.user._id,
    createdByModel: capitalizeFirstLetter(req.user.role)
  });

  // Update lab order status and link billing
  labOrder.status = 'pending-payment';
  labOrder.billing = billing._id;
  await labOrder.save();

  res.status(201).json({
    status: 'success',
    data: {
      billing
    }
  });
});

// @desc    Verify lab order payment status
// @route   GET /api/v1/lab-orders/:id/payment-status
// @access  Private
exports.checkLabOrderPaymentStatus = catchAsync(async (req, res, next) => {
  const labOrder = await LabOrder.findById(req.params.id).populate('billing');
  
  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  if (!labOrder.billing) {
    return res.status(200).json({
      status: 'success',
      data: {
        paid: false,
        message: 'No billing record found for this lab order'
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      paid: labOrder.billing.status === 'paid',
      billingStatus: labOrder.billing.status,
      billingId: labOrder.billing._id,
      amount: labOrder.billing.total
    }
  });
});

// @desc    Process payment for lab order
// @route   POST /api/v1/lab-orders/:id/process-payment
// @access  Private/Patient
exports.processLabOrderPayment = catchAsync(async (req, res, next) => {
  const labOrder = await LabOrder.findById(req.params.id).populate('billing');
  
  if (!labOrder) {
    return next(new AppError('No lab order found with that ID', 404));
  }

  if (!labOrder.billing) {
    return next(new AppError('No billing record found for this lab order', 400));
  }

  if (labOrder.billing.status === 'paid') {
    return next(new AppError('This lab order has already been paid', 400));
  }

   // Generate receipt number (example: REC-{timestamp}-{randomNum})
  const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Create payment
  const payment = await Payment.create({
    billing: labOrder.billing._id,
    patient: labOrder.patient,
    amount: req.body.amount || labOrder.billing.total,
    paymentMethod: req.body.paymentMethod,
    paymentType: 'lab-test',
    relatedLabOrder: labOrder._id,
    processedBy: req.user._id,
    processedByModel: capitalizeFirstLetter(req.user.role),
    receiptNumber: receiptNumber 
  });

  // Update billing status
  labOrder.billing.status = 'paid';
  await labOrder.billing.save();

  // Update lab order status
  labOrder.status = 'paid';
  await labOrder.save();

  // Create audit log
  await AuditLog.create({
    action: 'payment',
    entity: 'labOrder',
    entityId: labOrder._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: {
      status: 'paid',
      paymentId: payment._id
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      payment,
      labOrder
    }
  });
});

// @desc    Process lab order payment
// @route   POST /api/v1/lab-orders/:id/process-payment
// @access  Private/Receptionist
exports.processLabPayment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { paymentMethod, amount } = req.body;

  // 1. Verify the lab order exists and is pending payment
  const labOrder = await LabOrder.findOne({
    _id: id,
    status: 'pending-payment'
  }).populate('patient tests');

  if (!labOrder) {
    return next(new AppError('No pending payment lab order found with that ID', 404));
  }

  // 2. Create payment record
  const payment = await Payment.create({
    labOrder: id,
    patient: labOrder.patient._id,
    amount,
    paymentMethod,
    processedBy: req.user._id,
    status: 'completed'
  });

  // 3. Update lab order status and verification
  const updatedOrder = await LabOrder.findByIdAndUpdate(
    id,
    {
      status: 'paid',
      paymentStatus: 'paid',
      paymentVerified: true,
      payment: payment._id,
      $unset: { billing: 1 } // Remove billing reference if exists
    },
    { new: true, runValidators: true }
  );

  // 4. Update related billing record if exists
  if (labOrder.billing) {
    await Billing.findByIdAndUpdate(
      labOrder.billing,
      { status: 'paid', payment: payment._id }
    );
  }

  // 5. Create audit log
  await AuditLog.create({
    action: 'payment',
    entity: 'LabOrder',
    entityId: id,
    user: req.user._id,
    userModel: 'User',
    changes: {
      from: 'pending-payment',
      to: 'paid',
      paymentId: payment._id
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder,
      payment
    }
  });
});