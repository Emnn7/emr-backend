const mongoose = require('mongoose');

const diagnosticSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['X-ray', 'CT', 'MRI', 'Ultrasound', 'PET', 'Other'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  facility: {
    type: String,
    required: true
  },
  files: [{
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'pdf', 'dicom'],
      required: true
    },
    thumbnail: String // for images
  }],
  notes: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Diagnostic', diagnosticSchema);