const VitalSigns = require('../models/VitalSigns');
const Patient = require('../models/Patient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllVitalSigns = catchAsync(async (req, res, next) => {
  const vitalSigns = await VitalSigns.find({ patient: req.params.patientId });

  res.status(200).json({
    status: 'success',
    results: vitalSigns.length,
    data: {
      vitalSigns
    }
  });
});

exports.getVitalSigns = catchAsync(async (req, res, next) => {
  const vitalSigns = await VitalSigns.findById(req.params.id);

  if (!vitalSigns) {
    return next(new AppError('No vital signs found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      vitalSigns
    }
  });
});

exports.createVitalSigns = catchAsync(async (req, res, next) => {
  const patient = await Patient.findById(req.body.patient);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  const newVitalSigns = await VitalSigns.create({
    ...req.body,
    recordedBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: {
      vitalSigns: newVitalSigns
    }
  });
});

exports.updateVitalSigns = catchAsync(async (req, res, next) => {
  const vitalSigns = await VitalSigns.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!vitalSigns) {
    return next(new AppError('No vital signs found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      vitalSigns
    }
  });
});

exports.deleteVitalSigns = catchAsync(async (req, res, next) => {
  const vitalSigns = await VitalSigns.findByIdAndDelete(req.params.id);

  if (!vitalSigns) {
    return next(new AppError('No vital signs found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getAllVitalSignsWithoutPatient = catchAsync(async (req, res, next) => {
  const vitalSigns = await VitalSigns.find(req.query);

  res.status(200).json({
    status: 'success',
    results: vitalSigns.length,
    data: {
      vitalSigns
    }
  });
});