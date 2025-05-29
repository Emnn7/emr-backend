const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: [true, 'Billing must belong to a patient']
  },
  appointment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Appointment'
  },
  items: [
    {
      description: {
        type: String,
        required: [true, 'Please provide item description']
      },
      quantity: {
        type: Number,
        default: 1
      },
      unitPrice: {
        type: Number,
        required: [true, 'Please provide unit price']
      },
      total: {
        type: Number,
        required: [true, 'Please provide item total']
      }
    }
  ],
  subtotal: {
    type: Number,
    required: [true, 'Please provide subtotal']
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: [true, 'Please provide total amount']
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partially-paid', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    refPath: 'createdByModel',
    required: [true, 'Please provide creator ID']
  },
  createdByModel: {
    type: String,
    required: [true, 'Please provide creator model'],
    enum: ['Admin', 'Doctor', 'Receptionist']
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

billingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

billingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName phone'
  }).populate({
    path: 'appointment',
    select: 'date time'
  });
  next();
});

const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;