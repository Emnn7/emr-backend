const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/roles');

const doctorSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.DOCTOR
  },
  phone: {
    type: String,
    required: [true, 'Please provide your phone number'],
    validate: {
      validator: function(val) {
        // More lenient validation that accepts +prefix numbers
        return /^\+?[0-9\s\-\(\)]{7,}$/.test(val);
      },
      message: 'Please provide a valid phone number (e.g., +1234567890 or 1234567890)'
    }
  },
  specialization: {
    type: String,
    required: [true, 'Please provide your specialization'],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'Please provide your license number'],
    unique: true,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Please provide your department'],
    trim: true
  },
  active: {
    type: Boolean,
    default: true,
    select: true
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

doctorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

doctorSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

doctorSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};
doctorSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const Doctor = mongoose.model('Doctor', doctorSchema);
doctorSchema.index({ email: 1 }, { unique: true });
doctorSchema.index({ phone: 1 }, { unique: true });
module.exports = Doctor;