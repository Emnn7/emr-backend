const validator = require('validator');
const AppError = require('./appError');

exports.validatePatientData = (data) => {
  const errors = [];

  if (!data.firstName || !validator.isLength(data.firstName, { min: 2, max: 50 })) {
    errors.push('First name must be between 2 and 50 characters');
  }

  if (!data.lastName || !validator.isLength(data.lastName, { min: 2, max: 50 })) {
    errors.push('Last name must be between 2 and 50 characters');
  }

  if (!data.dateOfBirth || !validator.isDate(data.dateOfBirth)) {
    errors.push('Invalid date of birth');
  }

  if (!data.phone || !validator.isMobilePhone(data.phone, 'any', { strictMode: false })) {
    errors.push('Invalid phone number');
  }

  if (data.email && !validator.isEmail(data.email)) {
    errors.push('Invalid email address');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  return true;
};

exports.validateUserData = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.firstName) {
    if (!data.firstName || !validator.isLength(data.firstName, { min: 2, max: 50 })) {
      errors.push('First name must be between 2 and 50 characters');
    }
  }

  if (!isUpdate || data.lastName) {
    if (!data.lastName || !validator.isLength(data.lastName, { min: 2, max: 50 })) {
      errors.push('Last name must be between 2 and 50 characters');
    }
  }

  if (!isUpdate || data.email) {
    if (!data.email || !validator.isEmail(data.email)) {
      errors.push('Invalid email address');
    }
  }

  if (!isUpdate || data.phone) {
    if (!data.phone || !validator.isMobilePhone(data.phone, 'any', { strictMode: false })) {
      errors.push('Invalid phone number');
    }
  }

  if (!isUpdate && (!data.password || !validator.isLength(data.password, { min: 8 }))) {
    errors.push('Password must be at least 8 characters');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  return true;
};

exports.validateAppointmentData = (data) => {
  const errors = [];

  if (!data.patient || !validator.isMongoId(data.patient)) {
    errors.push('Invalid patient ID');
  }

  if (!data.doctor || !validator.isMongoId(data.doctor)) {
    errors.push('Invalid doctor ID');
  }

  if (!data.date || !validator.isDate(data.date)) {
    errors.push('Invalid appointment date');
  }

  if (!data.time || !validator.matches(data.time, /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
    errors.push('Invalid appointment time (use HH:MM format)');
  }

  if (!data.reason || !validator.isLength(data.reason, { min: 10, max: 500 })) {
    errors.push('Reason must be between 10 and 500 characters');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  return true;
};

exports.validatePrescriptionData = (data) => {
  const errors = [];

  if (!data.patient || !validator.isMongoId(data.patient)) {
    errors.push('Invalid patient ID');
  }

  if (!data.doctor || !validator.isMongoId(data.doctor)) {
    errors.push('Invalid doctor ID');
  }

  if (!data.medications || !Array.isArray(data.medications) || data.medications.length === 0) {
    errors.push('At least one medication is required');
  } else {
    data.medications.forEach((med, i) => {
      if (!med.name || !validator.isLength(med.name, { min: 2, max: 100 })) {
        errors.push(`Medication ${i + 1}: Name must be between 2 and 100 characters`);
      }
      if (!med.dosage || !validator.isLength(med.dosage, { min: 2, max: 50 })) {
        errors.push(`Medication ${i + 1}: Dosage must be between 2 and 50 characters`);
      }
      if (!med.frequency || !validator.isLength(med.frequency, { min: 2, max: 50 })) {
        errors.push(`Medication ${i + 1}: Frequency must be between 2 and 50 characters`);
      }
      if (!med.duration || !validator.isLength(med.duration, { min: 2, max: 50 })) {
        errors.push(`Medication ${i + 1}: Duration must be between 2 and 50 characters`);
      }
    });
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }

  return true;
};