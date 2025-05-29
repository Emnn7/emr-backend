const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

exports.validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorMessages = errors.array().map((err) => err.msg);
    next(new AppError(errorMessages.join('. '), 400));
  };
};