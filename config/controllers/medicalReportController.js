const fs = require('fs');
const crypto = require('crypto');
const MedicalReport = require('../models/MedicalReport');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');
const LabReport = require('../models/LabReport');
const VitalSigns = require('../models/VitalSigns');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const pdfService = require('../services/pdfService');
const { ROLES } = require('../config/roles');

// Helper to capitalize role
const capitalizeFirstLetter = (string) =>
  string.charAt(0).toUpperCase() + string.slice(1);

// Audit Log Creator
const createAuditLog = async (
  req,
  { action, entity, entityId, metadata = {}, status = 'success' }
) => {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId,
      user: req.user.id,
      userModel: capitalizeFirstLetter(req.user.role),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { ...metadata, status }
    });
  } catch (err) {
    console.error('Audit log creation failed:', err);
  }
};

/**
 * @desc    Get all medical reports
 * @route   GET /api/medical-reports
 * @access  Private/Admin (via middleware)
 */
exports.getAllMedicalReports = catchAsync(async (req, res, next) => {
    if (req.user.role === ROLES.DOCTOR) {
      req.query.generatedBy = req.user.id;
    }
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.patientId) query.patient = req.query.patientId;
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
  }

  const [reports, total] = await Promise.all([
    MedicalReport.find(query)
      .populate('patient', 'fullName phoneNumber')
      .populate('generatedBy', 'firstName lastName')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    MedicalReport.countDocuments(query)
  ]);

  await createAuditLog(req, {
    action: 'read',
    entity: 'medicalReport',
    metadata: {
      page,
      limit,
      results: reports.length,
      filters: Object.keys(query).length > 0 ? query : undefined
    }
  });

  res.status(200).json({
    status: 'success',
    results: reports.length,
    total,
    data: { reports }
  });
});


/**
 * @desc    Get a single medical report
 * @route   GET /api/medical-reports/:id
 * @access  Private/Admin, Doctor (via middleware)
 */
exports.getMedicalReport = catchAsync(async (req, res, next) => {
    const report = await MedicalReport.findById(req.params.id)
      .populate('patient', 'fullName phoneNumber dateOfBirth gender')
      .populate('generatedBy', 'firstName lastName');
  
    if (!report) {
      await createAuditLog(req, {
        action: 'read',
        entity: 'medicalReport',
        entityId: req.params.id,
        status: 'failed',
        metadata: { reason: 'report_not_found' }
      });
      return next(new AppError('No medical report found with that ID', 404));
    }
  
    // Additional permission check for doctors
    if (req.user.role === ROLES.DOCTOR && 
        (!report.generatedBy || !report.generatedBy._id.equals(req.user.id))) {
      return next(new AppError('Not authorized to view this report', 403));
    }
  
    await createAuditLog(req, {
      action: 'read',
      entity: 'medicalReport',
      entityId: report._id,
      metadata: { accessedAt: new Date() }
    });
  
    res.status(200).json({
      status: 'success',
      data: {
        report
      }
    });
  });
  
  /**
   * @desc    Delete a medical report
   * @route   DELETE /api/medical-reports/:id
   * @access  Private/Admin (via middleware)
   */
  exports.deleteMedicalReport = catchAsync(async (req, res, next) => {
    const report = await MedicalReport.findByIdAndDelete(req.params.id);
  
    if (!report) {
      await createAuditLog(req, {
        action: 'delete',
        entity: 'medicalReport',
        entityId: req.params.id,
        status: 'failed',
        metadata: { reason: 'report_not_found' }
      });
      return next(new AppError('No medical report found with that ID', 404));
    }
  
    await createAuditLog(req, {
      action: 'delete',
      entity: 'medicalReport',
      entityId: report._id,
      metadata: { deletedAt: new Date() }
    });
  
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

  // Add to medicalReportController.js
exports.downloadMedicalReport = catchAsync(async (req, res, next) => {
  const report = await MedicalReport.findById(req.params.id);
  
  if (!report) {
    return next(new AppError('No medical report found with that ID', 404));
  }

  // Implement actual file download logic here
  // For now, we'll mock it
  res.status(200).json({
    status: 'success',
    data: {
      downloadUrl: `/api/medical-reports/${report._id}/file`
    }
  });
});

/**
 * @desc    Generate a medical report PDF
 * @route   POST /api/medical-reports/generate
 * @access  Private/Admin, Doctor (via middleware & logic)
 */
exports.generateMedicalReport = catchAsync(async (req, res, next) => {
  const { patientId } = req.body;

  // 1. Validate patient
  const patient = await Patient.findById(patientId).select('+active');
  if (!patient || !patient.active) {
    await createAuditLog(req, {
      action: 'read',
      entity: 'patient',
      entityId: patientId,
      status: 'failed',
      metadata: { reason: 'patient_not_found_or_inactive' }
    });
    return next(new AppError('No active patient found', 404));
  }

  // 2. Doctor access rule: must have recent appointment
  if (req.user.role === ROLES.DOCTOR) {
    const hasRecentAppointment = await Appointment.findOne({
      doctor: req.user.id,
      patient: patientId,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    if (!hasRecentAppointment) {
      await createAuditLog(req, {
        action: 'generate',
        entity: 'medicalReport',
        status: 'failed',
        metadata: { reason: 'no_recent_appointment', patientId }
      });
      return next(new AppError('You must have treated this patient recently', 403));
    }
  }

  // 3. Fetch medical data
  let medicalData;
  try {
    medicalData = await Promise.all([
      Appointment.find({ patient: patientId })
        .populate('doctor', 'firstName lastName specialization')
        .sort('-date -time'),
      Prescription.find({ patient: patientId })
        .populate('doctor', 'firstName lastName')
        .sort('-createdAt'),
      LabOrder.find({ patient: patientId })
        .populate('doctor', 'firstName lastName')
        .sort('-createdAt'),
      LabReport.find({ patient: patientId })
        .populate('performedBy verifiedBy', 'firstName lastName')
        .sort('-createdAt'),
      VitalSigns.find({ patient: patientId })
        .populate('recordedBy', 'firstName lastName')
        .sort('-createdAt')
    ]);
  } catch (err) {
    await createAuditLog(req, {
      action: 'read',
      entity: 'medicalReport',
      status: 'failed',
      metadata: { error: err.message, patientId }
    });
    return next(new AppError('Failed to gather medical data', 500));
  }

  // 4. Generate PDF
  let reportPath;
  try {
    reportPath = await pdfService.generateMedicalReport({
      patient,
      appointments: medicalData[0],
      prescriptions: medicalData[1],
      labOrders: medicalData[2],
      labReports: medicalData[3],
      vitalSigns: medicalData[4]
    });
  } catch (err) {
    await createAuditLog(req, {
      action: 'generate',
      entity: 'medicalReport',
      status: 'failed',
      metadata: { error: err.message, patientId }
    });
    return next(new AppError('Failed to generate report', 500));
  }

  // 5. Create report record
  let newReport;
  try {
    newReport = await MedicalReport.create({
      patient: patientId,
      generatedBy: req.user.id,
      title: `Medical Report - ${new Date().toLocaleDateString()}`,
      accessKey: crypto.randomBytes(16).toString('hex'),
      metadata: {
        reportSize: fs.statSync(reportPath).size,
        sections: {
          appointments: medicalData[0].length,
          prescriptions: medicalData[1].length,
          labReports: medicalData[3].length
        }
      }
    });
  } catch (err) {
    fs.unlinkSync(reportPath); // Clean up file
    await createAuditLog(req, {
      action: 'create',
      entity: 'medicalReport',
      status: 'failed',
      metadata: { error: err.message, patientId }
    });
    return next(new AppError('Failed to create report record', 500));
  }

  // 6. Success audit
  await createAuditLog(req, {
    action: 'generate',
    entity: 'medicalReport',
    entityId: newReport._id,
    metadata: {
      patientId,
      reportSize: newReport.metadata.reportSize,
      generatedAt: newReport.createdAt
    }
  });

  // 7. Send file
  res.download(
    reportPath,
    `medical_report_${patient.fullName.replace(/\s+/g, '_')}.pdf`,
    (err) => {
      if (err) {
        createAuditLog(req, {
          action: 'download',
          entity: 'medicalReport',
          entityId: newReport._id,
          status: 'failed',
          metadata: { error: err.message }
        });
      }
      try {
        if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);
      } catch (cleanupErr) {
        console.error('Failed to cleanup report file:', cleanupErr);
      }
    }
  );
});
