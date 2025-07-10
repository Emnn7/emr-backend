// utils/cardNumberGenerator.js
const Patient = require('../models/Patient');

const generatePatientCardNumber = async () => {
  const prefix = 'PC'; // Patient Card prefix
  const randomSuffix = Math.floor(100000 + Math.random() * 900000); // 6-digit random
  const cardNumber = `${prefix}${randomSuffix}`;

  // Check if number exists (very unlikely but possible)
  const exists = await Patient.findOne({ patientCardNumber: cardNumber });
  return exists ? generatePatientCardNumber() : cardNumber;
};

module.exports = generatePatientCardNumber;