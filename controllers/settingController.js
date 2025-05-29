const Settings = require('../models/Setting');
const asyncHandler = require('express-async-handler');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private/Admin
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  res.json(settings);
});

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = asyncHandler(async (req, res) => {
  const {
    clinicName,
    address,
    phone,
    email,
    workingHours,
    timezone,
    appointmentInterval,
    enableOnlineBooking,
    minCancelNotice,
    maxFutureBooking,
    enableSMSNotifications,
    enableEmailNotifications,
    reminderLeadTime,
    currency,
    taxRate,
    paymentMethods,
    invoicePrefix
  } = req.body;

  const settings = await Settings.getSettings();

  // Update settings
  settings.clinicName = clinicName || settings.clinicName;
  settings.address = address || settings.address;
  settings.phone = phone || settings.phone;
  settings.email = email || settings.email;
  settings.workingHours = workingHours || settings.workingHours;
  settings.timezone = timezone || settings.timezone;
  settings.appointmentInterval = appointmentInterval || settings.appointmentInterval;
  settings.enableOnlineBooking = enableOnlineBooking !== undefined ? enableOnlineBooking : settings.enableOnlineBooking;
  settings.minCancelNotice = minCancelNotice || settings.minCancelNotice;
  settings.maxFutureBooking = maxFutureBooking || settings.maxFutureBooking;
  settings.enableSMSNotifications = enableSMSNotifications !== undefined ? enableSMSNotifications : settings.enableSMSNotifications;
  settings.enableEmailNotifications = enableEmailNotifications !== undefined ? enableEmailNotifications : settings.enableEmailNotifications;
  settings.reminderLeadTime = reminderLeadTime || settings.reminderLeadTime;
  settings.currency = currency || settings.currency;
  settings.taxRate = taxRate || settings.taxRate;
  settings.paymentMethods = paymentMethods || settings.paymentMethods;
  settings.invoicePrefix = invoicePrefix || settings.invoicePrefix;
  settings.updatedBy = req.user._id;
  settings.appointmentSlotDuration = appointmentSlotDuration || settings.appointmentSlotDuration;
if (billingRates) {
  settings.billingRates = {
    ...settings.billingRates,
    ...billingRates
  };
}

  const updatedSettings = await settings.save();
  res.json(updatedSettings);
});

// @desc    Get specific settings section
// @route   GET /api/settings/:section
// @access  Private/Admin
exports.getSettingsSection = asyncHandler(async (req, res) => {
  const { section } = req.params;
  const settings = await Settings.getSettings();
  
  if (!settings[section]) {
    return res.status(400).json({ message: 'Invalid settings section' });
  }

  res.json({ [section]: settings[section] });
});

// Add to settingController.js
exports.updatePricing = asyncHandler(async (req, res) => {
  const { procedurePricing } = req.body;
  const settings = await Settings.getSettings();
  
  settings.procedurePricing = procedurePricing;
  settings.updatedBy = req.user._id;
  
  const updatedSettings = await settings.save();
  res.json(updatedSettings);
});

exports.updateReportTemplates = asyncHandler(async (req, res) => {
  const { reportTemplates } = req.body;
  const settings = await Settings.getSettings();
  
  settings.reportTemplates = {
    ...settings.reportTemplates,
    ...reportTemplates
  };
  settings.updatedBy = req.user._id;
  
  const updatedSettings = await settings.save();
  res.json(updatedSettings);
});