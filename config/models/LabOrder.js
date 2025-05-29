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
      status: {
        type: String,
        enum: ['ordered', 'in-progress', 'completed', 'cancelled'],
        default: 'ordered'
      }
    }
  ],
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
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
    select: 'firstName lastName phone'
  }).populate({
    path: 'doctor',
    select: 'firstName lastName specialization'
  });
  next();
});

const LabOrder = mongoose.model('LabOrder', labOrderSchema);

module.exports = LabOrder;