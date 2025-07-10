const mongoose = require('mongoose');
const PatientProcedure = require('../models/patientProcedure');
const Payment = require('../models/Payment')
const Billing = require('../models/Billing')
const ProcedureCode = require('../models/ProcedureCode');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createPatientProcedure = catchAsync(async (req, res, next) => {
  const { patient, procedures, notes } = req.body;

  // Enhanced validation
  const invalidProcedures = procedures.filter(
    p => !mongoose.Types.ObjectId.isValid(p.procedure)
  );

  if (invalidProcedures.length > 0) {
    return next(new AppError(
      `Invalid procedure ID format: ${
        invalidProcedures.map(p => p.procedure).join(', ')
      }`, 
      400
    ));
  }

  // Check procedure existence
  const existingProcedures = await ProcedureCode.find({
    _id: { $in: procedures.map(p => p.procedure) }
  }).lean();

  const missingProcedures = procedures.filter(
    p => !existingProcedures.some(ep => ep._id.toString() === p.procedure)
  );

  if (missingProcedures.length > 0) {
    return next(new AppError(
      `Procedures not found: ${
        missingProcedures.map(p => p.procedure).join(', ')
      }`,
      400
    ));
  }

  // Create procedure record
  const patientProcedure = await PatientProcedure.create({
    patient,
    doctor: req.user.id,
    procedures: procedures.map(p => ({
      procedure: p.procedure,
      quantity: p.quantity || 1
    })),
    notes: notes || '',
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    data: { patientProcedure }
  });
});

exports.getPatientProcedures = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  const filter = {};
  
  if (status) {
    filter.status = status;
  }
  
  // For doctors, only show their own procedures
  if (req.user.role === 'doctor') {
    filter.doctor = req.user.id;
  }

  const patientProcedures = await PatientProcedure.find(filter)
    .populate('patient', 'firstName lastName')
    .populate('doctor', 'firstName lastName')
    .populate('procedures.procedure', 'code description price');

  res.status(200).json({
    status: 'success',
    results: patientProcedures.length,
    data: {
      patientProcedures
    }
  });
});

exports.updateProcedureStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const patientProcedure = await PatientProcedure.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!patientProcedure) {
    return next(new AppError('No procedure record found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      patientProcedure
    }
  });
});

exports.updatePaymentStatus = catchAsync(async (req, res, next) => {
  try {
    // 1. Find and validate procedure
    const procedure = await PatientProcedure.findById(req.params.id)
      .populate('patient doctor procedures.procedure');
    
    if (!procedure) {
      return next(new AppError('No procedure found with that ID', 404));
    }

    // 2. Validate payment method and type
    if (!req.body.paymentMethod || !Payment.schema.path('paymentMethod').enumValues.includes(req.body.paymentMethod)) {
      return next(new AppError(
        `Valid payment method required: ${Payment.schema.path('paymentMethod').enumValues.join(', ')}`,
        400
      ));
    }

    if (!req.body.paymentType || !Payment.schema.path('paymentType').enumValues.includes(req.body.paymentType)) {
      return next(new AppError(
        `Valid payment type required: ${Payment.schema.path('paymentType').enumValues.join(', ')}`,
        400
      ));
    }

    // 3. Prepare billing items with validation
    const items = procedure.procedures.map(proc => {
      if (!proc.procedure?.price) {
        throw new AppError(`Procedure ${proc.procedure?._id} has no price set`, 400);
      }
      return {
        description: proc.procedure.description || `Procedure ${proc.procedure.code}`,
        quantity: proc.quantity || 1,
        unitPrice: proc.procedure.price,
        total: (proc.procedure.price * (proc.quantity || 1))
      };
    });

    // 4. Calculate financials
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal; // Add tax/discount if needed

    // 5. Create billing record
    const billing = await Billing.create({
      patient: procedure.patient._id,
      items,
      subtotal,
      total,
      status: 'paid',
      paymentType: req.body.paymentType,
      createdBy: req.user._id,
      createdByModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)
    });

    // 6. Prepare services for payment record
    const paymentServices = items.map(item => ({
      code: `PROC-${Date.now().toString(36)}`,
      description: item.description,
      amount: item.total
    }));

    // 7. Create payment record with all required fields
    const newPayment = await Payment.create({
      billing: billing._id,
      patient: procedure.patient._id,
      amount: total,
      paymentMethod: req.body.paymentMethod,
      paymentType: req.body.paymentType,
      status: 'completed',
      services: paymentServices,
      relatedEntity: procedure._id,
      relatedEntityModel: 'PatientProcedure',
      processedBy: req.user._id,
      processedByModel: req.user.role === 'admin' ? 'Admin' : 'Receptionist',
      notes: `Payment for procedure ${procedure._id}`
    });

    // 8. Update procedure status
    const updatedProcedure = await PatientProcedure.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paymentStatus: 'paid',
        payment: newPayment._id,
        billing: billing._id,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    )
    .populate('payment billing patient doctor');

    // 9. Return complete response
    res.status(200).json({
      status: 'success',
      data: {
        procedure: updatedProcedure,
        payment: newPayment,
        billing
      }
    });

  } catch (error) {
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return next(new AppError(`Validation failed: ${errors.join('. ')}`, 400));
    }
    return next(error);
  }
});

exports.getPatientProcedure = catchAsync(async (req, res, next) => {
  // 1) Validate ID format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError('Invalid procedure ID format', 400));
  }

  // 2) Find the procedure with full population
  const procedure = await PatientProcedure.findById(req.params.id)
    .populate({
      path: 'patient',
      select: 'firstName lastName'
    })
    .populate({
      path: 'doctor', 
      select: 'firstName lastName'
    })
    .populate({
      path: 'procedures.procedure',
      select: 'code description price'
    });

  // 3) Handle not found
  if (!procedure) {
    return next(new AppError('No procedure found with that ID', 404));
  }

  // 4) Return response
  res.status(200).json({
    status: 'success',
    data: {
      procedure
    }
  });
});