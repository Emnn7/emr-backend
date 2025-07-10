const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { ROLES, checkPermission } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');

// Helper to capitalize role
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private
exports.getAllAppointments = catchAsync(async (req, res, next) => {
  let query;

  // Check user role and filter accordingly
  if (req.user.role === ROLES.DOCTOR) {
    query = Appointment.find({ doctor: req.user._id });
  } else if (req.user.role === ROLES.PATIENT) {
    query = Appointment.find({ patient: req.user._id });
  } else {
    query = Appointment.find();
  }
const appointments = await query.sort('-date -time').populate('patient', 'firstName lastName patientCardNumber');

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: {
      appointments
    }
  });
});

// Get today’s appointments
exports.getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      date: { $gte: today, $lt: tomorrow },
    })
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'firstName lastName specialization'); // <-- Add this

    res.status(200).json({ status: 'success', data: appointments });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};



// @desc    Get a single appointment
// @route   GET /api/v1/appointments/:id
// @access  Private
exports.getAppointment = catchAsync(async (req, res, next) => {
 const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'firstName lastName patientCardNumber')
    .populate('doctor', 'firstName lastName');
  if (!appointment) {
    return next(new AppError('No appointment found with that ID', 404));
  }

  // Check permissions
 if (
  req.user.role !== ROLES.ADMIN &&
  req.user.role !== ROLES.RECEPTIONIST &&
  (!appointment.doctor || appointment.doctor._id.toString() !== req.user._id.toString()) &&
  (!appointment.patient || appointment.patient._id.toString() !== req.user._id.toString())
) {
  return next(
    new AppError('You are not authorized to view this appointment', 403)
  );
}


  res.status(200).json({
    status: 'success',
    data: {
      appointment
    }
  });
});

// @desc    Create a new appointment
// @route   POST /api/v1/appointments
// @access  Private/Receptionist, Admin
exports.createAppointment = catchAsync(async (req, res, next) => {
  // Check if patient exists
  const patient = await Patient.findById(req.body.patient);
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  // Check if doctor exists
  const doctor = await Doctor.findById(req.body.doctor);
  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  // Check for conflicting appointments
  const conflictingAppointment = await Appointment.findOne({
    doctor: req.body.doctor,
    date: req.body.date,
    time: req.body.time,
    status: { $ne: 'cancelled' }
  });

  if (conflictingAppointment) {
    return next(
      new AppError('The doctor already has an appointment at that time', 400)
    );
  }

  const newAppointment = await Appointment.create(req.body);

  // Log the action
  await AuditLog.create({
    action: 'create',
    entity: 'appointment',
    entityId: newAppointment._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send email notification (in production)
  if (process.env.NODE_ENV === 'production') {
    await emailService.sendAppointmentConfirmation({
      patientEmail: patient.email,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      date: newAppointment.date,
      time: newAppointment.time,
      reason: newAppointment.reason
    });
  }

  res.status(201).json({
    status: 'success',
    data: {
      appointment: newAppointment
    }
  });
});

// @desc    Update an appointment
// @route   PATCH /api/v1/appointments/:id
// @access  Private/Receptionist, Admin, Doctor
exports.updateAppointment = catchAsync(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(new AppError('No appointment found with that ID', 404));
  }

  // Check permissions
  if (
    req.user.role !== ROLES.ADMIN &&
    req.user.role !== ROLES.RECEPTIONIST &&
    appointment.doctor.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError('You are not authorized to update this appointment', 403)
    );
  }

  // Check for conflicting appointments if time or doctor is being changed
  if (req.body.doctor || req.body.date || req.body.time) {
    const doctorId = req.body.doctor || appointment.doctor;
    const date = req.body.date || appointment.date;
    const time = req.body.time || appointment.time;

    const conflictingAppointment = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: doctorId,
      date,
      time,
      status: { $ne: 'cancelled' }
    });

    if (conflictingAppointment) {
      return next(
        new AppError('The doctor already has an appointment at that time', 400)
      );
    }
  }

  const updatedAppointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  // Log the action
  await AuditLog.create({
    action: 'update',
    entity: 'appointment',
    entityId: updatedAppointment._id,
    user: req.user._id,
    userModel: capitalizeFirstLetter(req.user.role),
    changes: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json({
    status: 'success',
    data: {
      appointment: updatedAppointment
    }
  });
});

// @desc    Delete an appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private/Admin, Receptionist
exports.deleteAppointment = catchAsync(async (req, res, next) => {
  const appointment = await Appointment.findByIdAndDelete(req.params.id);

  if (!appointment) {
    return next(new AppError('No appointment found with that ID', 404));
  }

  // Check permissions
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.RECEPTIONIST) {
    return next(
      new AppError('You are not authorized to delete this appointment', 403)
    );
  }

  // Log the action
  await AuditLog.create({
    action: 'delete',
    entity: 'appointment',
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

// @desc    Get appointments by date range
// @route   GET /api/v1/appointments/date-range
// @access  Private
exports.getAppointmentsByDateRange = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(
      new AppError('Please provide both startDate and endDate parameters', 400)
    );
  }

  let query;

  // Filter by role
  if (req.user.role === ROLES.DOCTOR) {
    query = Appointment.find({
      doctor: req.user._id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
  } else if (req.user.role === ROLES.PATIENT) {
    query = Appointment.find({
      patient: req.user._id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
  } else {
    query = Appointment.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
  }

  const appointments = await query.sort('date time');

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: {
      appointments
    }
  });
});

// @desc    Get available time slots for a doctor on a specific date
// @route   GET /api/v1/appointments/available-slots
// @access  Private
exports.getAvailableTimeSlots = catchAsync(async (req, res, next) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return next(
      new AppError('Please provide both doctorId and date parameters', 400)
    );
  }

  // Check if doctor exists
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  // Get all appointments for the doctor on the specified date
  const appointments = await Appointment.find({
    doctor: doctorId,
    date: new Date(date),
    status: { $ne: 'cancelled' }
  });

  // Define available time slots (assuming 30-minute slots from 8AM to 5PM)
  const allSlots = [];
  for (let hour = 8; hour < 17; hour++) {
    allSlots.push(`${hour}:00`);
    allSlots.push(`${hour}:30`);
  }

  // Get booked time slots
  const bookedSlots = appointments.map(app => app.time);

  // Filter available slots
  const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

  res.status(200).json({
    status: 'success',
    data: {
      availableSlots
    }
  });
});

exports.getAppointmentsByPatient = catchAsync(async (req, res, next) => {
  const appointments = await Appointment.find({ patient: req.params.patientId });
  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: { appointments }
  });
});

// @desc    Get appointments by doctor
// @route   GET /api/appointments/doctor/:doctorId
// @access  Private
exports.getAppointmentsByDoctor = catchAsync(async (req, res, next) => {
  const appointments = await Appointment.find({ doctor: req.params.doctorId })
    .sort('-date -time')
    .populate('patient', 'firstName lastName');

  res.status(200).json({
    status: 'success',
    results: appointments.length,
    data: {
      appointments
    }
  });
});