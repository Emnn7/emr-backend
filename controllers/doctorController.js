const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');
const LabReport = require('../models/LabReport');
const VitalSigns = require('../models/VitalSigns');
const MedicalHistory = require('../models/MedicalHistory');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Get doctor's profile
// @route   GET /api/v1/doctors/me
// @access  Private/Doctor
exports.getMyProfile = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findById(req.user._id);

  res.status(200).json({
    status: 'success',
    data: {
      doctor
    }
  });
});

// @desc    Update doctor's profile
// @route   PATCH /api/v1/doctors/update-me
// @access  Private/Doctor
exports.updateMyProfile = catchAsync(async (req, res, next) => {
  // Filter out unwanted fields that are not allowed to be updated
  const filteredBody = {};
  const allowedFields = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'specialization',
    'department'
  ];
  Object.keys(req.body).forEach(el => {
    if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
  });

  const updatedDoctor = await Doctor.findByIdAndUpdate(
    req.user._id,
    filteredBody,
    {
      new: true,
      runValidators: true
    }
  );

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'doctor',
    entityId: updatedDoctor._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: filteredBody,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      doctor: updatedDoctor
    }
  });
});

// @desc    Get doctor's patients
// @route   GET /api/v1/doctors/my-patients
// @access  Private/Doctor
exports.getMyPatients = catchAsync(async (req, res, next) => {
  // Get patients assigned as primary doctor
  const primaryPatients = await Patient.find({ primaryDoctor: req.user._id })
    .select('firstName lastName phone dateOfBirth gender')
    .lean();

  // Get patients from appointments
  const appointmentPatients = await Appointment.find({ doctor: req.user._id })
    .distinct('patient');
  
  const appointmentPatientsData = await Patient.find({ 
    _id: { $in: appointmentPatients },
    primaryDoctor: { $ne: req.user._id } // Exclude already included primary patients
  }).select('firstName lastName phone dateOfBirth gender').lean();

  // Combine and deduplicate
  const allPatients = [...primaryPatients, ...appointmentPatientsData];
  const uniquePatients = allPatients.filter(
    (patient, index, self) => 
      index === self.findIndex(p => p._id.toString() === patient._id.toString())
  );

  res.status(200).json({
    status: 'success',
    results: uniquePatients.length,
    data: uniquePatients
  });
});

// @desc    Get doctor's appointments
// @route   GET /api/v1/doctors/my-appointments
// @access  Private/Doctor
exports.getMyAppointments = catchAsync(async (req, res, next) => {
  const appointments = await Appointment.find({ doctor: req.user._id })
    .populate('patient', 'firstName lastName phone')
    .sort('-date -time');

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: {
      appointments
    }
  });
});

// @desc    Get doctor's prescriptions
// @route   GET /api/v1/doctors/my-prescriptions
// @access  Private/Doctor
exports.getMyPrescriptions = catchAsync(async (req, res, next) => {
  const prescriptions = await Prescription.find({ doctor: req.user._id })
    .populate('patient', 'firstName lastName phone')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: prescriptions.length,
    data: {
      prescriptions
    }
  });
});

// @desc    Get doctor's lab orders
// @route   GET /api/v1/doctors/my-lab-orders
// @access  Private/Doctor
exports.getMyLabOrders = catchAsync(async (req, res, next) => {
  const labOrders = await LabOrder.find({ doctor: req.user._id })
    .populate('patient', 'firstName lastName phone')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: labOrders.length,
    data: {
      labOrders
    }
  });
});

// @desc    Get patient's medical history
// @route   GET /api/v1/doctors/patient-history/:patientId
// @access  Private/Doctor
exports.getPatientHistory = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check if doctor has seen this patient before
  const hasAppointment = await Appointment.findOne({
    doctor: req.user._id,
    patient: req.params.patientId
  });

  if (!hasAppointment && req.user.role !== ROLES.ADMIN) {
    return next(
      new AppError('You are not authorized to view this patient history', 403)
    );
  }

  // Get all relevant data
  const [
    patientData,
    appointments,
    prescriptions,
    labOrders,
    labReports,
    vitalSigns
  ] = await Promise.all([
    Patient.findById(req.params.patientId).select('-__v'),
    Appointment.find({ patient: req.params.patientId })
      .populate('doctor', 'firstName lastName specialization')
      .sort('-date -time'),
    Prescription.find({ patient: req.params.patientId })
      .populate('doctor', 'firstName lastName')
      .sort('-createdAt'),
    LabOrder.find({ patient: req.params.patientId })
      .populate('doctor', 'firstName lastName')
      .sort('-createdAt'),
    LabReport.find({ patient: req.params.patientId })
      .populate('performedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort('-createdAt'),
    VitalSigns.find({ patient: req.params.patientId })
      .populate('recordedBy', 'firstName lastName')
      .sort('-createdAt')
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
      patient: patientData,
      appointments,
      prescriptions,
      labOrders,
      labReports,
      vitalSigns
    }
  });
});

// @desc    Get all doctors
// @route   GET /api/v1/doctors
// @access  Private/Admin, Receptionist
exports.getAllDoctors = catchAsync(async (req, res, next) => {
  const doctors = await Doctor.find().select('-__v -password');

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: {
      doctors
    }
  });
});

// @desc    Get a single doctor
// @route   GET /api/v1/doctors/:id
// @access  Private/Admin, Receptionist
exports.getDoctor = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findById(req.params.id).select('-__v -password');

  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      doctor
    }
  });
});

// @desc    Get doctor's schedule
// @route   GET /api/v1/doctors/:id/schedule
// @access  Private/Admin, Receptionist
exports.getDoctorSchedule = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  const appointments = await Appointment.find({
    doctor: req.params.id,
    status: { $ne: 'cancelled' }
  }).sort('date time');

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: {
      appointments
    }
  });
});

// @desc    Update doctor's profile (admin only)
// @route   PATCH /api/v1/doctors/:id
// @access  Private/Admin
exports.updateDoctor = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-__v -password');

  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'doctor',
    entityId: doctor._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      doctor
    }
  });
});

// @desc    Deactivate doctor account
// @route   DELETE /api/v1/doctors/:id
// @access  Private/Admin
exports.deactivateDoctor = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  );

  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'doctor',
    entityId: doctor._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: { active: false },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});


// @desc    Get doctor's assigned patients (primary care)
// @route   GET /api/v1/doctors/:id/assigned-patients
// @access  Private/Admin, Doctor
exports.getAssignedPatients = catchAsync(async (req, res, next) => {
  const patients = await Patient.find({ primaryDoctor: req.params.id })
    .select('firstName lastName phone dateOfBirth')
    .sort('lastName');

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: { patients }
  });
});

// @desc    Get all patient-doctor assignments
// @route   GET /api/patients/assignments/all
// @access  Private/Admin
exports.getAllPatientDoctorAssignments = catchAsync(async (req, res, next) => {
  const patients = await Patient.find({ primaryDoctor: { $ne: null } })
    .populate('primaryDoctor', 'firstName lastName specialization')
    .select('firstName lastName phone primaryDoctor')
    .sort('lastName');

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: {
      assignments: patients.map(patient => ({
        _id: patient._id,
        patient: {
          _id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone
        },
        doctor: patient.primaryDoctor
      }))
    }
  });
});



// Get patient medical history (for assigned patients only)
exports.getPatientMedicalHistory = async (req, res) => {
  try {
    const isAssigned = await verifyDoctorPatient(req.user._id, req.params.patientId);
    if (!isAssigned) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized to access this patient\'s medical history'
      });
    }

    const history = await MedicalHistory.find({ patient: req.params.patientId })
      .populate('patient', 'firstName lastName')
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: history.length,
      data: history
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get patient vital signs (for assigned patients only)
exports.getPatientVitalSigns = async (req, res) => {
  try {
    const isAssigned = await verifyDoctorPatient(req.user._id, req.params.patientId);
    if (!isAssigned) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized to access this patient\'s vital signs'
      });
    }

    const vitals = await VitalSigns.find({ patient: req.params.patientId })
      .populate('recordedBy', 'name')
      .sort('-recordedAt')
      .limit(50); // Limit to most recent 50 readings

    res.status(200).json({
      status: 'success',
      results: vitals.length,
      data: vitals
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get patient lab orders (for assigned patients only)
exports.getPatientLabOrders = async (req, res) => {
  try {
    const isAssigned = await verifyDoctorPatient(req.user._id, req.params.patientId);
    if (!isAssigned) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized to access this patient\'s lab orders'
      });
    }

    const labOrders = await LabOrder.find({ patient: req.params.patientId })
      .populate('orderedBy', 'name')
      .populate('tests.test')
      .sort('-orderDate');

    res.status(200).json({
      status: 'success',
      results: labOrders.length,
      data: labOrders
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get patient prescriptions (for assigned patients only)
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const isAssigned = await verifyDoctorPatient(req.user._id, req.params.patientId);
    if (!isAssigned) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized to access this patient\'s prescriptions'
      });
    }

    const prescriptions = await Prescription.find({ patient: req.params.patientId })
      .populate('prescribedBy', 'name')
      .populate('medication')
      .sort('-datePrescribed');

    res.status(200).json({
      status: 'success',
      results: prescriptions.length,
      data: prescriptions
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get basic patient info (for assigned patients)
exports.getPatientInfo = async (req, res) => {
  try {
    const isAssigned = await verifyDoctorPatient(req.user._id, req.params.patientId);
    if (!isAssigned) {
      return res.status(403).json({
        status: 'fail',
        message: 'Not authorized to access this patient\'s information'
      });
    }

    const patient = await Patient.findById(req.params.patientId)
      .select('-password -__v -createdAt -updatedAt');

    if (!patient) {
      return res.status(404).json({
        status: 'fail',
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: patient
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
const verifyDoctorPatient = async (doctorId, patientId) => {
  // Check if doctor is primary care physician (if you have that field)
  const isPrimary = await Patient.findOne({
    _id: patientId,
    primaryDoctor: doctorId
  });
  
  // Check if doctor has any appointments with patient
  const hasAppointment = await Appointment.findOne({
    doctor: doctorId,
    patient: patientId
  });
  
  return !!isPrimary || !!hasAppointment;
};