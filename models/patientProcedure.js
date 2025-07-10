const mongoose = require('mongoose');

const patientProcedureSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
   payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  billing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Billing'
  },
  procedures: [{
    procedure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProcedureCode',
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'billed', 'paid', 'cancelled'],
    default: 'pending'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

patientProcedureSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PatientProcedure = mongoose.model('PatientProcedure', patientProcedureSchema);

module.exports = PatientProcedure;