const path = require('path'); 
const fs = require('fs');
const crypto = require('crypto');
const MedicalReport = require('../models/MedicalReport');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');
const LabReport = require('../models/LabReport');
const VitalSigns = require('../models/VitalSigns');
const MedicalHistory = require('../models/MedicalHistory');
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
      user: req.user._id,
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
      req.query.generatedBy = req.user._id;
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
    .populate({
  path: 'patient',
  select: 'firstName lastName _id',
})
    .populate('patient', 'firstName lastName phoneNumber dateOfBirth gender')
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
        (!report.generatedBy || !report.generatedBy._id.equals(req.user._id))) {
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
  
  if (!report || !report.filePath) {
    return next(new AppError('No medical report found with that ID', 404));
  }

  if (!fs.existsSync(report.filePath)) {
    return next(new AppError('Report file is missing', 404));
  }

  const filename = `medical_report_${report.patient?.fullName?.replace(/\s+/g, '_') || report._id}.pdf`;
  
  res.download(report.filePath, filename, (err) => {
    if (err) {
      createAuditLog(req, {
        action: 'download',
        entity: 'medicalReport',
        entityId: report._id,
        status: 'failed',
        metadata: { error: err.message }
      });
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

  // 2. Doctor access rule
  if (req.user.role === ROLES.DOCTOR) {
    const hasRecentAppointment = await Appointment.findOne({
      doctor: req.user._id,
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
        .sort('-createdAt'),
      MedicalHistory.find({ patient: patientId }).sort('-createdAt')
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

  // 4. Create report record first
  const newReport = await MedicalReport.create({
    patient: patientId,
    title: `Medical Report - ${patient.firstName} ${patient.lastName}`,
    generatedBy: req.user._id,
    accessKey: crypto.randomBytes(16).toString('hex'),
    metadata: {
      reportSize: 0, // Will be updated after generation
      sections: {
        appointments: medicalData[0].length,
        prescriptions: medicalData[1].length,
        labReports: medicalData[3].length
      }
    }
  });

  // 5. Generate PDF and handle file storage
  let reportPath;
  try {
    // Create storage directory if it doesn't exist
    const storagePath = path.join(__dirname, '../storage/reports');
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    // Generate PDF
    const tempPath = await pdfService.generateMedicalReport({
      patient,
      medicalHistory: medicalData[5],
      appointments: medicalData[0],
      prescriptions: medicalData[1],
      labOrders: medicalData[2],
      labReports: medicalData[3],
      vitalSigns: medicalData[4]
    });

    // Move to permanent location
    const filename = `report_${newReport._id}_${Date.now()}.pdf`;
    const finalPath = path.join(storagePath, filename);
    fs.renameSync(tempPath, finalPath);

    // Update report with file info
    newReport.filePath = finalPath;
    newReport.metadata.reportSize = fs.statSync(finalPath).size;
    await newReport.save();
    reportPath = finalPath;
  } catch (err) {
    // Clean up the report record if PDF generation fails
    await MedicalReport.findByIdAndDelete(newReport._id);
    await createAuditLog(req, {
      action: 'generate',
      entity: 'medicalReport',
      status: 'failed',
      metadata: { error: err.message, patientId }
    });
    return next(new AppError('Failed to generate report', 500));
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
const downloadFilename = patient.fullName 
  ? `medical_report_${patient.fullName.replace(/\s+/g, '_')}.pdf`
  : `medical_report_${patientId}.pdf`;

res.download(
  reportPath,
  downloadFilename,
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
  }
);
});

// New route to serve stored PDF files
exports.getMedicalReportFile = catchAsync(async (req, res, next) => {
  const report = await MedicalReport.findById(req.params.id);
  
  if (!report || !report.filePath) {
    return next(new AppError('No medical report file found', 404));
  }

  if (!fs.existsSync(report.filePath)) {
    return next(new AppError('Report file missing', 404));
  }

  res.sendFile(report.filePath);
});