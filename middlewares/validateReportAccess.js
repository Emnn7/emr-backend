// middleware/validateReportAccess.js
exports.validateReportAccess = catchAsync(async (req, res, next) => {
    const report = await MedicalReport.findById(req.params.id);
    
    if (!report) return next(new AppError('Report not found', 404));
  
    // Admins can access any report
    if (req.user.role === ROLES.ADMIN) return next();
  
    // Doctors can access their own reports
    if (req.user.role === ROLES.DOCTOR && 
        report.generatedBy.equals(req.user.id)) return next();
  
    // Patients can access their own reports (if you add patient portal)
    if (req.user.role === ROLES.PATIENT && 
        report.patient.equals(req.user.id)) return next();
  
    await AuditLog.create({
      action: 'unauthorized_report_access',
      user: req.user.id,
      entity: 'medical_report',
      entityId: req.params.id
    });
  
    return next(new AppError('You are not authorized to access this report', 403));
  });