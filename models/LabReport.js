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
  tests: [{
    testId: {
      type: mongoose.Schema.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: [true, 'Please provide test name']
    },
    code: {
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
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed'
    }
  }],
  findings: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.ObjectId,
    required: true,
    refPath: 'performedByModel' // Dynamic reference
  },
  performedByModel: {
    type: String,
    required: true,
    enum: ['Doctor', 'LabAssistant', 'Admin'] // Your actual models
  },
  verifiedBy: {
    type: mongoose.Schema.ObjectId,
    refPath: 'verifiedByModel' // Dynamic reference
  },
  verifiedByModel: {
    type: String,
    enum: ['Doctor', 'Admin'] // Only doctors/admins can verify
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'verified', 'cancelled'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
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
    select: 'tests status priority'
  }).populate({
    path: 'performedBy',
    select: 'firstName lastName',
    options: { model: this.performedByModel }
  }).populate({
    path: 'verifiedBy',
    select: 'firstName lastName',
    options: { model: this.verifiedByModel }
  });
  next();
});

const LabReport = mongoose.model('LabReport', labReportSchema);

module.exports = LabReport;