const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: [true, 'Medical history must belong to a patient']
  },
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Doctor',
    required: [true, 'Medical history must be recorded by a doctor']
  },
  appointment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Appointment'
  },
  symptoms: {
    type: String,
    trim: true
  },
  diagnosis: {
    type: String,
    trim: true,
    required: [true, 'Diagnosis is required']
  },
  notes: {
    type: String,
    trim: true
  },
  familyHistory: {
    type: String,
    trim: true
  },
  followUpDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
 pastIllnesses: {
  type: [String],
  default: []
},
surgicalHistory: {
  type: [String],
  default: []
},

lifestyle: {
  smoking: {
    type: Boolean,
    default: false
  },
  alcohol: {
    type: Boolean,
    default: false
  },
  exercise: {
    type: String,
    trim: true
  },
  diet: {
    type: String,
    trim: true
  }
},
allergies: [{
  name: String,
  reaction: String,
  severity: String
}],
currentMedications: [{
  name: String,
  dosage: String,
  frequency: String,
  startDate: Date,
  prescribedBy: String
}]
});

medicalHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

medicalHistorySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName phone'
  }).populate({
    path: 'doctor',
    select: 'firstName lastName specialization'
  });
  next();
});

const MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema);

module.exports = MedicalHistory;