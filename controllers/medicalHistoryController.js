const MedicalHistory = require('../models/MedicalHistory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllMedicalHistories = catchAsync(async (req, res, next) => {
  const medicalHistories = await MedicalHistory.find({ patient: req.params.patientId });

  res.status(200).json({
    status: 'success',
    results: medicalHistories.length,
    data: medicalHistories // Consistent data structure
  });
});

exports.getMedicalHistory = catchAsync(async (req, res, next) => {
  const medicalHistory = await MedicalHistory.findById(req.params.id);

  if (!medicalHistory) {
    return next(new AppError('No medical history found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      medicalHistory
    }
  });
});

exports.createMedicalHistory = catchAsync(async (req, res, next) => {
  // Validate required fields
  if (!req.body.patient || !req.body.diagnosis) {
    return next(new AppError('Patient ID and diagnosis are required', 400));
  }

  // Prepare the medical history data
  const medicalHistoryData = {
    patient: req.body.patient,
    doctor: req.user._id, // Get from authenticated user
    symptoms: req.body.symptoms,
    diagnosis: req.body.diagnosis,
    notes: req.body.notes,
    familyHistory: req.body.familyHistory,
    followUpDate: req.body.followUpDate,
    pastIllnesses: req.body.pastIllnesses,
    surgicalHistory: req.body.surgicalHistory,
    allergies: req.body.allergies || [],
    currentMedications: req.body.currentMedications || [],
    lifestyle: req.body.lifestyle || {
      smoking: false,
      alcohol: false,
      exerciseFrequency: '',
      diet: ''
    }
  };

  // Create the medical history
  const newMedicalHistory = await MedicalHistory.create(medicalHistoryData);

  res.status(201).json({
    status: 'success',
    data: {
      medicalHistory: newMedicalHistory
    }
  });
});

exports.updateMedicalHistory = catchAsync(async (req, res, next) => {
  // Get the existing medical history
  const existingHistory = await MedicalHistory.findById(req.params.id);
  
  if (!existingHistory) {
    return next(new AppError('No medical history found with that ID', 404));
  }

  // Prepare the update data
  const updateData = {
    ...req.body,
    updatedAt: Date.now()
  };

  // Update the medical history
  const medicalHistory = await MedicalHistory.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      medicalHistory
    }
  });
});

exports.deleteMedicalHistory = catchAsync(async (req, res, next) => {
  const medicalHistory = await MedicalHistory.findByIdAndDelete(req.params.id);

  if (!medicalHistory) {
    return next(new AppError('No medical history found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Rename the second getAllMedicalHistories to something else
exports.getAllMedicalHistoriesByFilter = catchAsync(async (req, res, next) => {
  const doctorId = req.query.doctorId;
  let filter = {};
  if (doctorId) {
    filter.doctor = doctorId;
  }

  const histories = await MedicalHistory.find(filter)
    .populate('patient')
    .populate('doctor');

  res.status(200).json({
    status: 'success',
    results: histories.length,
    data: {
      medicalHistory: histories
    }
  });
});


exports.getMedicalHistoriesByDoctor = catchAsync(async (req, res, next) => {
  const histories = await MedicalHistory.find({ doctor: req.params.doctorId })
    .populate('patient');
  
  res.status(200).json({
    status: 'success',
    results: histories.length,
    data: {
      medicalHistory: histories // Consistent structure
    }
  });
});
































