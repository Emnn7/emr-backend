const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  billing: {
    type: mongoose.Schema.ObjectId,
    ref: 'Billing',
    required: [true, 'Payment must belong to a billing']
  },
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: [true, 'Payment must belong to a patient']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide payment amount']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Please provide payment method'],
    enum: ['cash', 'card', 'insurance', 'bank-transfer', 'mobile-money']
  },
  transactionId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  // Add to paymentSchema
paymentType: {
  type: String,
  enum: ['registration', 'procedure', 'lab-test', 'other'],
  required: true
},
relatedEntity: {
  type: mongoose.Schema.ObjectId,
  refPath: 'relatedEntityModel'
},
relatedEntityModel: {
  type: String,
  enum: ['Patient', 'PatientProcedure', 'LabTest']
},
  notes: {
    type: String,
    trim: true
  },
  services: [{
    code: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true }
  }],
  receiptNumber: { 
    type: String,
    unique: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  labOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'LabOrder' },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  relatedLabOrder: {
  type: mongoose.Schema.ObjectId,
  ref: 'LabOrder'
},
  processedBy: {
    type: mongoose.Schema.ObjectId,
    refPath: 'processedByModel',
    required: [true, 'Please provide processor ID']
  },
  processedByModel: {
    type: String,
    required: [true, 'Please provide processor model'],
    enum: ['Admin', 'Receptionist']
  }
}, {
  timestamps: true, // ✅ moved here
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Automatically update `updatedAt` on save
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate billing and patient on find
paymentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName phone'
  }).populate({
    path: 'billing',
    select: 'total status'
  });
  next();
});

// Virtual for total amount (sum of services minus discount plus tax)
paymentSchema.virtual('paymentTypeLabel').get(function() {
  const types = {
    'registration': 'Registration Fee',
    'procedure': 'Medical Procedure',
    'lab-test': 'Lab Test',
    'other': 'Other Service'
  };
  return types[this.paymentType] || this.paymentType;
});
// Auto-generate unique receipt number if not provided
paymentSchema.pre('save', async function(next) {
  if (!this.receiptNumber) {
    const count = await this.constructor.countDocuments();
    this.receiptNumber = `REC-${Date.now()}-${count + 1}`;
  }
  next();
});
paymentSchema.pre('save', function(next) {
  if (this.paymentType === 'registration' && !this.relatedEntity) {
    this.relatedEntity = this.patient;
    this.relatedEntityModel = 'Patient';
  }
  next();
});
// Add payment confirmation number
paymentSchema.add({
  confirmationNumber: {
    type: String,
    unique: true
  }
});

// Add pre-save hook for confirmation number
paymentSchema.pre('save', function(next) {
  if (!this.confirmationNumber) {
    this.confirmationNumber = `CONF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
