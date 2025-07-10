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
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));
  const patient = await Patient.findById(req.body.patient);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Transform the request body to match the schema
  const vitalData = {
    patient: req.body.patient,
    recordedBy: req.user._id,
    notes: req.body.notes
  };

  // Process each vital sign field - ensure we're capturing the values correctly
  const vitalFields = [
    'temperature', 'heartRate', 'respiratoryRate', 
    'oxygenSaturation', 'height', 'weight', 'bloodSugar'
  ];

  vitalFields.forEach(field => {
    if (req.body[field]?.value !== undefined && req.body[field]?.value !== '') {
      vitalData[field] = {
        value: parseFloat(req.body[field].value), // Ensure numeric values
        unit: req.body[field].unit || getDefaultUnit(field)
      };
    }
  });

  // Process blood pressure separately
  if (req.body.bloodPressure) {
    vitalData.bloodPressure = {
      systolic: parseFloat(req.body.bloodPressure.systolic),
      diastolic: parseFloat(req.body.bloodPressure.diastolic),
      unit: 'mmHg'
    };
  }

  // Process blood sugar fasting status
  if (req.body.bloodSugar) {
    vitalData.bloodSugar = vitalData.bloodSugar || {};
    vitalData.bloodSugar.fasting = req.body.bloodSugar.fasting || false;
    if (req.body.bloodSugar.value !== undefined && req.body.bloodSugar.value !== '') {
      vitalData.bloodSugar.value = parseFloat(req.body.bloodSugar.value);
    }
  }

  // Process BMI if provided or calculate it
  if (req.body.bmi) {
    vitalData.bmi = {
      value: parseFloat(req.body.bmi.value),
      classification: req.body.bmi.classification
    };
  } else if (vitalData.height?.value && vitalData.weight?.value) {
    // Calculate BMI if not provided
    const heightInMeters = vitalData.height.value / 100;
    const bmiValue = (vitalData.weight.value / (heightInMeters * heightInMeters)).toFixed(1);
    vitalData.bmi = {
      value: parseFloat(bmiValue),
      classification: getBmiClassification(bmiValue)
    };
  }

  console.log('Processed vital data before save:', JSON.stringify(vitalData, null, 2));

  const newVitalSigns = await VitalSigns.create(vitalData);

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