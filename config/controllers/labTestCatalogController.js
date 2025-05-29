const LabTestCatalog = require('../models/LabTestCatalog');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Create a new catalog test
exports.createCatalogTest = catchAsync(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(new AppError('Test name is required', 400));
  }

  const existing = await LabTestCatalog.findOne({ name });
  if (existing) {
    return next(new AppError('Test with this name already exists', 409));
  }

  const test = await LabTestCatalog.create({ name });

  res.status(201).json({
    status: 'success',
    data: {
      test
    }
  });
});

// Get all catalog tests
exports.getAllCatalogTests = catchAsync(async (req, res, next) => {
  const tests = await LabTestCatalog.find().sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: {
      tests
    }
  });
});
