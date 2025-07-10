const mongoose = require('mongoose');

const labTestCatalogSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Test name is required'],
    unique: true,
    trim: true
  },
   code: {
    type: String,
    required: [true, 'Test code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Test category is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
   price: {
    type: Number,
    required: [true, 'Test price is required'],
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LabTestCatalog', labTestCatalogSchema);
