const mongoose = require('mongoose');

const labReportSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: [true, 'Lab report must belong to a patient']
  },
  labOrder: {
    type: mongoose.Schema.ObjectId,
    ref: 'LabOrder',
    required: [true, 'Lab report must belong to a lab order']
  },
  testName: {
    type: String,
    required: [true, 'Please provide test name']
  },
  testCode: {
    type: String,
    required: [true, 'Please provide test code']
  },
  result: {
    type: String,
    required: [true, 'Please provide test result']
  },
  unit: {
    type: String
  },
  normalRange: {
    type: String
  },
  abnormalFlag: {
    type: String,
    enum: ['high', 'low', 'normal', 'critical'],
    default: 'normal'
  },
  notes: {
    type: String,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'LabAssistant',
    required: [true, 'Please provide lab assistant ID']
  },
  verifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Doctor'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'verified', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
   isExternal: {
    type: Boolean,
    default: false
  },
  externalLab: {
    name: String,
    accreditation: String,
    contact: {
      phone: String,
      email: String
    },
    reportDate: Date
  },
  methodology: String,
  qualityControl: {
    performed: Boolean,
    results: String
  },
  attachments: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
});

labReportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

labReportSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName phone'
  }).populate({
    path: 'labOrder',
    select: 'tests status'
  }).populate({
    path: 'performedBy',
    select: 'firstName lastName'
  }).populate({
    path: 'verifiedBy',
    select: 'firstName lastName'
  });
  next();
});

const LabReport = mongoose.model('LabReport', labReportSchema);

module.exports = LabReport;