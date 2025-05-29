const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'patientDemographics', 'appointmentAnalysis', etc.
  parameters: { type: Object }, // Date ranges, filters, etc.
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  data: { type: Object } // The actual report data
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);