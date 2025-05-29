const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/roles');

const labAssistantSchema = new mongoose.Schema({
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
    default: ROLES.LAB_ASSISTANT
  },
  phone: {
    type: String,
    required: [true, 'Please provide your phone number'],
    validate: {
      validator: function(val) {
        return validator.isMobilePhone(val, 'any', { strictMode: false });
      },
      message: 'Please provide a valid phone number'
    }
  },
  licenseNumber: {
    type: String,
    unique: true,
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

labAssistantSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

labAssistantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

labAssistantSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

labAssistantSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

labAssistantSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};


const LabAssistant = mongoose.model('LabAssistant', labAssistantSchema);
labAssistantSchema.index({ email: 1 }, { unique: true });
labAssistantSchema.index({ phone: 1 }, { unique: true });
module.exports = LabAssistant;