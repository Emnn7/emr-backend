const Consultation = require('../models/Consultation');
const MedicalHistory = require('../models/MedicalHistory');
const AppError = require('../utils/appError');
const AuditLog = require('../models/AuditLog');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

exports.createConsultation = async (req, res, next) => {
  try {
    const { patient, notes, diagnosis, createMedicalHistory, symptoms } = req.body;
    const doctor = req.user._id;

    const consultation = await Consultation.create({
      patient,
      doctor,
      notes,
      diagnosis
    });

    // Optional medical history creation
    if (createMedicalHistory) {
      await MedicalHistory.create({
        patient,
        doctor,
        diagnosis,
        symptoms,
        notes,
        createdAt: consultation.createdAt
      });
    }

    // Log the action
    await AuditLog.create({
      action: 'create',
      entity: 'consultation',
      entityId: consultation._id,
      user: req.user._id,
      userModel: capitalizeFirstLetter(req.user.role),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({ status: 'success', data: consultation });
  } catch (err) {
    next(err);
  }
};

exports.getConsultationsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const consultations = await Consultation.find({ patient: patientId })
      .populate('doctor', 'name email')
      .sort({ createdAt: -1 });

    // Log the action
    await AuditLog.create({
      action: 'read',
      entity: 'consultation',
      entityId: null, // multiple records, or log patientId if helpful
      user: req.user._id,
      userModel: capitalizeFirstLetter(req.user.role),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { patientId }
    });

    res.status(200).json({ status: 'success', data: consultations });
  } catch (err) {
    next(err);
  }
};
