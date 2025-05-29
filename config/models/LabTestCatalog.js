const mongoose = require('mongoose');

const labTestCatalogSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Test name is required'],
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LabTestCatalog', labTestCatalogSchema);
