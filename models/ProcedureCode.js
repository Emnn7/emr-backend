const mongoose = require('mongoose');

const procedureCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Procedure code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['consultation', 'procedure', 'test', 'medication', 'other']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

procedureCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const ProcedureCode = mongoose.model('ProcedureCode', procedureCodeSchema);

module.exports = ProcedureCode;