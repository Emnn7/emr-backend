const AppError = require('./appError');

exports.successResponse = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    data
  });
};

exports.errorResponse = (res, message, statusCode = 400) => {
  res.status(statusCode).json({
    status: 'fail',
    message
  });
};

exports.handleAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
  };
};

exports.notFound = (entity) => {
  return new AppError(`${entity} not found`, 404);
};

exports.unauthorized = () => {
  return new AppError('You are not authorized to perform this action', 403);
};

exports.validationError = (errors) => {
  return new AppError(`Validation error: ${errors.join('. ')}`, 400);
};