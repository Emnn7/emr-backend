const ProcedureCode = require('../models/ProcedureCode');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllProcedureCodes = catchAsync(async (req, res, next) => {
  const procedureCodes = await ProcedureCode.find();
  
  res.status(200).json({
    status: 'success',
    results: procedureCodes.length,
    data: {
      procedureCodes: procedureCodes.map(code => ({
        ...code._doc,
        price: Number(code.price.toFixed(2)) // Ensure proper number format
      }))
    }
  });
});

exports.createProcedureCode = catchAsync(async (req, res, next) => {
  console.log('🔧 Received POST request to create procedure code');
    console.log('📦 Request body:', req.body);
  const newProcedureCode = await ProcedureCode.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      procedureCode: newProcedureCode
    }
  });
});

exports.updateProcedureCode = catchAsync(async (req, res, next) => {
  const procedureCode = await ProcedureCode.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!procedureCode) {
    return next(new AppError('No procedure code found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      procedureCode
    }
  });
});

exports.deleteProcedureCode = catchAsync(async (req, res, next) => {
  const procedureCode = await ProcedureCode.findByIdAndDelete(req.params.id);

  if (!procedureCode) {
    return next(new AppError('No procedure code found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});