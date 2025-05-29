const LabTest = require('../models/LabTest');  // Your LabTest model
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Create Lab Test
// Create Lab Test
exports.createLabTest = catchAsync(async (req, res, next) => {
  const requiredFields = ['testName', 'result', 'unit', 'normalRange', 'patientId'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
  }

  const test = new LabTest({
    testName: req.body.testName,
    result: req.body.result,
    unit: req.body.unit,
    normalRange: req.body.normalRange,
    interpretation: req.body.interpretation,
    patientId: req.body.patientId,
    performedBy: req.user.name || 'Unknown'
  });

  await test.save();

  res.status(201).json({
    status: 'success',
    data: {
      test
    }
  });
});

// Get all Lab Tests
exports.getAllLabTests = catchAsync(async (req, res, next) => {
  const tests = await LabTest.find().populate('patientId', 'firstName lastName');
  res.status(200).json({
    status: 'success',
    data: {
      tests
    }
  });
});

// Get all Lab Tests
exports.getAllLabTests = catchAsync(async (req, res, next) => {
  const tests = await LabTest.find();  // You can apply any filters or sorting if needed
  res.status(200).json({
    status: 'success',
    data: {
      tests
    }
  });
});

// Update Lab Test
exports.updateLabTest = catchAsync(async (req, res, next) => {
  const test = await LabTest.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!test) {
    return next(new AppError('Test not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      test
    }
  });
});

// Delete Lab Test
exports.deleteLabTest = catchAsync(async (req, res, next) => {
  const test = await LabTest.findByIdAndDelete(req.params.id);

  if (!test) {
    return next(new AppError('Test not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get Lab Stats (Recent Lab Tests)
exports.getLabStats = catchAsync(async (req, res, next) => {
  const stats = {
    totalTests: await LabTest.countDocuments(),
    recentTests: await LabTest.find()
      .sort('-dateOfTest')  // Sort by most recent tests
      .limit(5)  // Limit to the 5 most recent tests
      .populate('patientId', 'name')  // Assuming patientId is a reference to another model
  };

  res.status(200).json({
    status: 'success',
    data: stats
  });
});
