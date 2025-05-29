// models/MedicalReport.js
const mongoose = require('mongoose');

const medicalReportSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // or whatever model it should reference
  },
  accessKey: {
    type: String,
    required: true,
    unique: true
  },
  metadata: {
    reportSize: Number,
    sections: {
      appointments: Number,
      prescriptions: Number,
      labReports: Number
    }
  },
  filePath: String
});


module.exports = mongoose.model('MedicalReport', medicalReportSchema);
