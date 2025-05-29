const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: [true, 'Prescription must belong to a patient']
  },
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Doctor',
    required: [true, 'Prescription must be prescribed by a doctor']
  },
  appointment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Appointment'
  },
  medications: [
    {
      name: {
        type: String,
        required: [true, 'Please provide medication name'],
        trim: true
      },
      dosage: {
        type: String,
        required: [true, 'Please provide dosage'],
        trim: true
      },
      frequency: {
        type: String,
        required: [true, 'Please provide frequency'],
        trim: true
      },
      duration: {
        type: String,
        required: [true, 'Please provide duration'],
        trim: true
      },
      instructions: {
        type: String,
        trim: true
      },
      quantity: {
        type: Number,
        required: [true, 'Please provide quantity']
      }
    }
  ],
  diagnosis: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
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

prescriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

prescriptionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName phone'
  }).populate({
    path: 'doctor',
    select: 'firstName lastName specialization'
  });
  next();
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = Prescription;