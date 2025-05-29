const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');
const LabReport = require('../models/LabReport');
const VitalSigns = require('../models/VitalSigns');
const Billing = require('../models/Billing');
const MedicalReport = require('../models/MedicalReport');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const pdfService = require('../services/pdfService');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Get all patients
// @route   GET /api/v1/patients
// @access  Private/Admin, Receptionist, Doctor
exports.getAllPatients = catchAsync(async (req, res, next) => {
  let query;

  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    // Get patients who have appointments with this doctor
    const doctorAppointments = await Appointment.find({
      doctor: req.user._id
    }).distinct('patient');
    query = Patient.find({ _id: { $in: doctorAppointments } });
  } else {
    query = Patient.find();
  }

  const patients = await query.select('-__v').sort('lastName firstName');

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: {
      patients
    }
  });
});


// Get recent patients (e.g., last 5 added)
exports.getRecentPatients = async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 }).limit(5);
    res.status(200).json({ status: 'success', data: patients });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// @desc    Search patients by phone number
// @route   GET /api/v1/patients/search
// @access  Private/Admin, Receptionist, Doctor
exports.searchPatients = catchAsync(async (req, res, next) => {
  const { searchTerm } = req.query;

  if (!searchTerm) {
    return next(new AppError('Please provide a search term', 400));
  }

  let query;
  const searchRegex = { $regex: searchTerm, $options: 'i' };

  // Normalize phone number (remove +, 0, spaces)
  const normalizedPhone = searchTerm.replace(/^\+|^0|\s/g, '');
  
  // Filter based on user role
  if (req.user.role === ROLES.DOCTOR) {
    const doctorAppointments = await Appointment.find({
      doctor: req.user._id
    }).distinct('patient');
    
    query = Patient.find({
      _id: { $in: doctorAppointments },
      $or: [
        { phone: { $regex: normalizedPhone, $options: 'i' } },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { patientId: searchRegex }
      ]
    });
  } else {
    query = Patient.find({
      $or: [
        { phone: { $regex: normalizedPhone, $options: 'i' } },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { patientId: searchRegex }
      ]
    });
  }

  const patients = await query.select('_id firstName lastName phone dateOfBirth patientId');

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: {
      patients
    }
  });
});

// @desc    Get a single patient
// @route   GET /api/v1/patients/:id
// @access  Private
exports.getPatient = catchAsync(async (req, res, next) => {
  if (!req.params.id || req.params.id === 'undefined') {
    return next(new AppError('Patient ID is required', 400));
  }

  const patient = await Patient.findById(req.params.id).select('-__v');

  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    req.params.id !== req.user._id.toString()
  ) {
    // For doctors, check if they have seen this patient
    if (req.user.role === ROLES.DOCTOR) {
      const hasAppointment = await Appointment.findOne({
        doctor: req.user._id,
        patient: req.params.id
      });
      if (!hasAppointment) {
        return next(
          new AppError('You are not authorized to view this patient', 403)
        );
      }
    } else {
      return next(
        new AppError('You are not authorized to view this patient', 403)
      );
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      patient
    }
  });
});

// @desc    Create a new patient
// @route   POST /api/v1/patients
// @access  Private/Admin, Receptionist
exports.createPatient = catchAsync(async (req, res, next) => {
  // Check if phone number already exists
  const existingPatient = await Patient.findOne({ phone: req.body.phone });
  if (existingPatient) {
    return next(
      new AppError('A patient with that phone number already exists', 400)
    );
  }

  const newPatient = await Patient.create(req.body);

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'patient',
    entityId: newPatient._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    status: 'success',
    data: {
      patient: newPatient
    }
  });
});

// @desc    Update a patient
// @route   PATCH /api/v1/patients/:id
// @access  Private/Admin, Receptionist
exports.updatePatient = catchAsync(async (req, res, next) => {
  // Prevent updating phone number if provided
  if (req.body.phone) {
    return next(
      new AppError('You cannot change the patient phone number', 400)
    );
  }

  const updatedPatient = await Patient.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).select('-__v');

  if (!updatedPatient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'patient',
    entityId: updatedPatient._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      patient: updatedPatient
    }
  });
});

// @desc    Delete a patient
// @route   DELETE /api/v1/patients/:id
// @access  Private/Admin
exports.deletePatient = catchAsync(async (req, res, next) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);

  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'patient',
    entityId: req.params.id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get patient's medical history
// @route   GET /api/v1/patients/:id/medical-history
// @access  Private/Admin, Doctor, Receptionist
exports.getPatientMedicalHistory = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST
  ) {
    // For doctors, check if they have seen this patient
    if (req.user.role === ROLES.DOCTOR) {
      const hasAppointment = await Appointment.findOne({
        doctor: req.user._id,
        patient: req.params.id
      });
      if (!hasAppointment) {
        return next(
          new AppError('You are not authorized to view this patient history', 403)
        );
      }
    } else {
      return next(
        new AppError('You are not authorized to view this patient history', 403)
      );
    }
  }

  // Get all relevant data
  const [
    appointments,
    prescriptions,
    labOrders,
    labReports,
    vitalSigns,
    billings
  ] = await Promise.all([
    Appointment.find({ patient: req.params.id })
      .populate('doctor', 'firstName lastName specialization')
      .sort('-date -time'),
    Prescription.find({ patient: req.params.id })
      .populate('doctor', 'firstName lastName')
      .sort('-createdAt'),
    LabOrder.find({ patient: req.params.id })
      .populate('doctor', 'firstName lastName')
      .sort('-createdAt'),
    LabReport.find({ patient: req.params.id })
      .populate('performedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort('-createdAt'),
    VitalSigns.find({ patient: req.params.id })
      .populate('recordedBy', 'firstName lastName')
      .sort('-createdAt'),
    Billing.find({ patient: req.params.id }).sort('-createdAt')
  ]);

  // Log the action
  await AuditLog.create({
    action: 'read',
    entity: 'patient',
    entityId: patient._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      patient,
      appointments,
      prescriptions,
      labOrders,
      labReports,
      vitalSigns,
      billings
    }
  });
});

// @desc    Get patient medical reports list
// @route   GET /api/patients/:id/medical-reports
// @access  Private/Admin, Doctor
exports.getMedicalReportsList = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.DOCTOR) {
    return next(new AppError('You are not authorized to view these reports', 403));
  }

  // For doctors, check if they have seen this patient
  if (req.user.role === ROLES.DOCTOR) {
    const hasAppointment = await Appointment.findOne({
      doctor: req.user._id,
      patient: req.params.id
    });

    if (!hasAppointment) {
      return next(new AppError('You are not authorized to view these reports', 403));
    }
  }

  const reports = await MedicalReport.find({ patient: req.params.id })
    .select('title createdAt updatedAt status')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    data: {
      reports
    }
  });
});

// @desc    Verify patient by phone number
// @route   GET /api/patients/verify
// @access  Private/Receptionist
exports.verifyPatient = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.query;

  const patient = await Patient.findOne({ phoneNumber })
    .select('fullName phoneNumber dateOfBirth gender')
    .lean();

  if (!patient) {
    return next(new AppError('Patient not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      exists: true,
      patient
    }
  });
});


// @desc    Record patient's vital signs
// @route   POST /api/patients/:id/vital-signs
// @access  Private/LabAssistant, Admin
exports.recordVitalSigns = catchAsync(async (req, res, next) => {
  // In the controller, before permission check
console.log('User role:', req.user.role);
console.log('Has VITAL_SIGNS_RECORD permission:', checkPermission(req.user.role, 'VITAL_SIGNS_RECORD'));
console.log('User role:', req.user.role);
  console.log('Permissions check:', checkPermission(req.user.role, 'VITAL_SIGNS_RECORD'));
   // 1. Check if patient exists
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // 2. Check permissions - IMPORTANT: Use checkPermission function
  if (!checkPermission(req.user.role, 'VITAL_SIGNS_RECORD')) {
    return next(new AppError('You are not authorized to record vitals', 403));
  }
  // 3. Prepare data
  const vitalData = {
    patient: req.params.id,
    recordedBy: req.user._id,
    ...req.body
  };

  // 4. Create record
  const newVitalSigns = await VitalSigns.create(vitalData);

  // 5. Log the action
 await AuditLog.create({
  action: 'create', // Already correct
  entity: 'vitalSigns', // Must be lowercase
  entityId: newVitalSigns._id,
  user: req.user._id, // Be consistent with id vs _id
  userModel: capitalizeFirstLetter(req.user.role),
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});

  res.status(201).json({
    status: 'success',
    data: {
      vitalSigns: newVitalSigns
    }
  });
});
// @desc    Get patient's vital signs
// @route   GET /api/v1/patients/:id/vital-signs
// @access  Private/Admin, Doctor, LabAssistant
exports.getPatientVitalSigns = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.LAB_ASSISTANT
  ) {
    // For doctors, check if they have seen this patient
    if (req.user.role === ROLES.DOCTOR) {
      const hasAppointment = await Appointment.findOne({
        doctor: req.user._id,
        patient: req.params.id
      });
      if (!hasAppointment) {
        return next(
          new AppError('You are not authorized to view this data', 403)
        );
      }
    } else {
      return next(
        new AppError('You are not authorized to view this data', 403)
      );
    }
  }

  const vitalSigns = await VitalSigns.find({ patient: req.params.id })
    .populate('recordedBy', 'firstName lastName')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: vitalSigns.length,
    data: {
      vitalSigns
    }
  });
});

// @desc    Get unassigned patients
// @route   GET /api/v1/patients/unassigned
// @access  Private/Admin
exports.getUnassignedPatients = catchAsync(async (req, res, next) => {
  const patients = await Patient.find({ primaryDoctor: null })
    .select('firstName lastName phone dateOfBirth')
    .sort('lastName');

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: { patients }
  });
});

// @desc    Assign doctor to patient
// @route   POST /api/patients/assign-doctor
// @access  Private/Admin
// In patientController.js
exports.assignDoctorToPatient = catchAsync(async (req, res, next) => {
  const { patientId, doctorId } = req.body;

  const patient = await Patient.findByIdAndUpdate(
    patientId,
    { primaryDoctor: doctorId },
    { new: true }
  ).select('firstName lastName phone primaryDoctor');

  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'patient',
    entityId: patient._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: { primaryDoctor: doctorId },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      patient
    }
  });
});

// @desc    Get patients by doctor
// @route   GET /api/patients/by-doctor/:doctorId
// @access  Private/Admin
exports.getPatientsByDoctor = catchAsync(async (req, res, next) => {
  const patients = await Patient.find({ primaryDoctor: req.params.doctorId })
    .select('firstName lastName phone dateOfBirth')
    .sort('lastName');

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: { patients }
  });
});

exports.recordVitalSigns = async (req, res, next) => {
  try {
    const { patient, temperature, pulse, respirationRate, bloodPressure, weight, height } = req.body;
    const recordedBy = req.user._id;

    const vitals = await VitalSigns.create({
      patient,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      weight,
      height,
      recordedBy
    });

    res.status(201).json({ status: 'success', data: vitals });
  } catch (err) {
    next(err);
  }
};

exports.createPrescription = async (req, res, next) => {
  try {
    const { patient, medications, notes } = req.body;
    const doctor = req.user._id;

    const prescription = await Prescription.create({
      patient,
      doctor,
      medications,
      notes
    });

    res.status(201).json({ status: 'success', data: prescription });
  } catch (err) {
    next(err);
  }
};

exports.createBilling = async (req, res, next) => {
  try {
    const { patient, services, totalAmount, paymentStatus } = req.body;
    const receptionist = req.user._id;

    const bill = await Billing.create({
      patient,
      services,
      totalAmount,
      paymentStatus,
      createdBy: receptionist
    });

    res.status(201).json({ status: 'success', data: bill });
  } catch (err) {
    next(err);
  }
};
exports.getPatientPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.params.id });
    res.status(200).json({
      status: 'success',
      data: prescriptions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get patient's lab orders
// @route   GET /api/v1/patients/:id/lab-orders
// @access  Private/Admin, Doctor, LabAssistant
exports.getPatientLabOrders = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.LAB_ASSISTANT
  ) {
    // For doctors, check if they have seen this patient
    if (req.user.role === ROLES.DOCTOR) {
      const hasAppointment = await Appointment.findOne({
        doctor: req.user._id,
        patient: req.params.id
      });
      if (!hasAppointment) {
        return next(
          new AppError('You are not authorized to view this data', 403)
        );
      }
    } else {
      return next(
        new AppError('You are not authorized to view this data', 403)
      );
    }
  }

  const labOrders = await LabOrder.find({ patient: req.params.id })
    .populate('doctor', 'firstName lastName')
    .populate('tests')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: labOrders.length,
    data: {
      labOrders
    }
  });
});

// @desc    Get all patient-doctor assignments
// @route   GET /api/patients/assignments
// @access  Private/Admin
// Get all assignments (both primary and appointment-based)
exports.getAllPatientDoctorAssignments = catchAsync(async (req, res, next) => {
  // Get primary doctor assignments
  const primaryAssignments = await Patient.find({ primaryDoctor: { $ne: null } })
    .populate('primaryDoctor', 'firstName lastName specialization')
    .select('firstName lastName phone dateOfBirth gender primaryDoctor')
    .lean();

  // Get appointment-based assignments
  const appointmentAssignments = await Appointment.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $group: { _id: { doctor: "$doctor", patient: "$patient" } } },
    {
      $lookup: {
        from: 'patients',
        localField: '_id.patient',
        foreignField: '_id',
        as: 'patient'
      }
    },
    { $unwind: '$patient' },
    {
      $lookup: {
        from: 'doctors',
        localField: '_id.doctor',
        foreignField: '_id',
        as: 'doctor'
      }
    },
    { $unwind: '$doctor' },
    {
      $project: {
        _id: 0,
        patient: {
          _id: '$patient._id',
          firstName: '$patient.firstName',
          lastName: '$patient.lastName',
          phone: '$patient.phone',
          dateOfBirth: '$patient.dateOfBirth',
          gender: '$patient.gender'
        },
        doctor: {
          _id: '$doctor._id',
          firstName: '$doctor.firstName',
          lastName: '$doctor.lastName',
          specialization: '$doctor.specialization'
        },
        assignmentType: 'appointment'
      }
    }
  ]);

  // Format primary assignments to match structure
  const formattedPrimaryAssignments = primaryAssignments.map(pa => ({
    patient: {
      _id: pa._id,
      firstName: pa.firstName,
      lastName: pa.lastName,
      phone: pa.phone,
      dateOfBirth: pa.dateOfBirth,
      gender: pa.gender
    },
    doctor: pa.primaryDoctor,
    assignmentType: 'primary'
  }));

  // Combine both types of assignments
  const allAssignments = [...formattedPrimaryAssignments, ...appointmentAssignments];

  res.status(200).json({
    status: 'success',
    results: allAssignments.length,
    data: {
      assignments: allAssignments
    }
  });
});
// @desc    Unassign doctor from patient
// @route   DELETE /api/patients/:patientId/doctor
// @access  Private/Admin
exports.unassignDoctorFromPatient = catchAsync(async (req, res, next) => {
  const patient = await Patient.findById(req.params.patientId);
  
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  if (!patient.primaryDoctor) {
    return next(new AppError('This patient has no assigned doctor', 400));
  }

  const previousDoctor = patient.primaryDoctor;
  patient.primaryDoctor = undefined; // Using undefined instead of null for consistency
  await patient.save();

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'patient',
    entityId: patient._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: { primaryDoctor: { from: previousDoctor, to: null } },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      patient: {
        _id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        primaryDoctor: patient.primaryDoctor
      }
    }
  });
});


exports.getPatientForVitals = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id).select('firstName lastName patientId phone gender dateOfBirth'); // only select essential fields

    if (!patient) {
      return res.status(404).json({
        status: 'fail',
        message: 'Patient not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: patient,
    });
  } catch (error) {
    console.error('Error fetching patient for vitals:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// @desc    Get all vital signs
// @route   GET /api/vital-signs
// @access  Private/Admin, Doctor, LabAssistant
exports.getAllVitalSigns = catchAsync(async (req, res, next) => {
  const vitalSigns = await VitalSigns.find()
    .populate('patient', 'firstName lastName')
    .populate('recordedBy', 'firstName lastName')
    .sort('-createdAt')
    .limit(50);

  res.status(200).json({
    status: 'success',
    results: vitalSigns.length,
    data: {
      vitalSigns
    }
  });
});