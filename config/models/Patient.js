const mongoose = require('mongoose');
const validator = require('validator');

const patientSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide your first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please provide your last name'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Please provide your date of birth']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Please provide your gender']
  },
  address: {
    type: String,
    required: [true, 'Please provide your address'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Please provide your city'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Please provide your country'],
    trim: true
  },
  primaryDoctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Doctor',
    default: null
  }
,
  phone: {
    type: String,
    required: [true, 'Please provide your phone number'],
    validate: {
      validator: function(val) {
        return /^\+?[0-9\s\-\(\)]{7,}$/.test(val);
      },
      message: 'Please provide a valid phone number (e.g., +1234567890 or 1234567890)'
    }
  },
  email: {
    type: String,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide your phone number'],
      validate: {
        validator: function(val) {
          return /^\+?[0-9\s\-\(\)]{7,}$/.test(val);
        },
        message: 'Please provide a valid phone number (e.g., +1234567890 or 1234567890)'
      }
    }
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    default: 'unknown'
  },
  allergies: [
    {
      name: {
        type: String,
        trim: true
      },
      reaction: {
        type: String,
        trim: true
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
        default: 'moderate'
      }
    }
  ],
  medicalHistory: [
    {
      condition: {
        type: String,
        trim: true
      },
      diagnosisDate: {
        type: Date
      },
      status: {
        type: String,
        enum: ['active', 'resolved', 'chronic'],
        default: 'active'
      }
    }
  ],
  medications: [
    {
      name: {
        type: String,
        trim: true
      },
      dosage: {
        type: String,
        trim: true
      },
      frequency: {
        type: String,
        trim: true
      },
      startDate: {
        type: Date
      },
      endDate: {
        type: Date
      },
      prescribedBy: {
        type: String,
        trim: true
      }
    }
  ],
  insurance: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    groupNumber: {
      type: String,
      trim: true
    },
    validUntil: {
      type: Date
    }
  },
  active: {
    type: Boolean,
    default: true,
    select: false
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

patientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

patientSchema.index({ firstName: 'text', lastName: 'text', phone: 'text' });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
