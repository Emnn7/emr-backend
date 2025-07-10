const mongoose = require('mongoose');

const labOrderSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: [true, 'Lab order must belong to a patient']
  },
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Doctor',
    required: [true, 'Lab order must be ordered by a doctor']
  },
  appointment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Appointment'
  },
  report: {
  type: mongoose.Schema.ObjectId,
  ref: 'LabReport'
},
status: {
  type: String,
  enum: ['pending-payment', 'paid', 'in-progress', 'completed', 'cancelled'],
  default: 'pending-payment'
},
paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
paymentVerified: { type: Boolean, default: false },
payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  tests: [
    {
      name: {
        type: String,
        required: [true, 'Please provide test name']
      },
      code: {
        type: String,
        required: [true, 'Please provide test code']
      },
      description: {
        type: String,
        trim: true
      },
       price: {
        type: Number,
        required: true,
        min: 0
      },
      status: {
        type: String,
        enum: ['pending', 'pending-payment', 'paid', 'in-progress', 'completed', 'cancelled'],
  default: 'pending'
      }
    }
  ],
  notes: {
    type: String,
    trim: true
  },
billing: {
  type: mongoose.Schema.ObjectId,
  ref: 'Billing'
},
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
    priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine'
  },
  dueDate: {
    type: Date,
    default: function() {
      // Default to 24 hours from now for stat, 72 hours for urgent, 1 week for routine
      const date = new Date();
      if (this.priority === 'stat') {
        date.setHours(date.getHours() + 24);
      } else if (this.priority === 'urgent') {
        date.setHours(date.getHours() + 72);
      } else {
        date.setDate(date.getDate() + 7);
      }
      return date;
    }
  },
});

labOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

labOrderSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName phone patientCardNumber' // Added patientCardNumber
  }).populate({
    path: 'doctor',
    select: 'firstName lastName specialization'
  });
  next();
});
labOrderSchema.pre('save', function(next) {
  if (this.tests && this.tests.some(test => !test.price)) {
    throw new Error('All tests must have a price');
  }
  next();
});

const LabOrder = mongoose.model('LabOrder', labOrderSchema);

module.exports = LabOrder;