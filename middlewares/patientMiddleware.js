// middleware/patientMiddleware.js
exports.checkPatientStatus = (req, res, next) => {
  if (req.patient.status !== 'active' && req.user.role !== 'admin') {
    return next(new AppError('This patient record is not active', 403));
  }
  next();
};