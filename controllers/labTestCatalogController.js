const LabTestCatalog = require('../models/LabTestCatalog');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Create a new catalog test
exports.createCatalogTest = catchAsync(async (req, res, next) => {
  const { name, code, category, description, price, isActive } = req.body;

  if (!name || !code || !category) {
    return next(new AppError('Name, code, and category are required', 400));
  }

  const existing = await LabTestCatalog.findOne({ name });
  if (existing) {
    return next(new AppError('Test with this name already exists', 409));
  }

  const test = await LabTestCatalog.create({
    name,
    code,
    category,
    description,
    price,
    isActive
  });

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

// Update catalog test
exports.updateCatalogTest = catchAsync(async (req, res, next) => {
  const test = await LabTestCatalog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!test) {
    return next(new AppError('No test found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      test
    }
  });
});

// Delete catalog test
exports.deleteCatalogTest = catchAsync(async (req, res, next) => {
  const test = await LabTestCatalog.findByIdAndDelete(req.params.id);

  if (!test) {
    return next(new AppError('No test found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});