const mongoose = require('mongoose');

// Make sure to register all user models before using this schema
require('./Admin');
require('./Doctor');
require('./LabAssistant');
require('./Receptionist');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Please provide action type'],
    enum: ['create', 'payment', 'create_temp', 'read', 'update', 'delete', 'generate', 'download', 'login', 'logout']
  },
  entity: {
    type: String,
    required: [true, 'Please provide entity type'],
    enum: [
      'patient',
      'appointment',
      'doctor',
      'labOrder',
      'labReport',
      'prescription',
      'billing',
      'payment',
      'user',
      'admin',
      'medicalReport',
      'vitalSigns',
      'consultation',
      'medicalHistory'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Optional for 'read all', 'login', etc.
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel', // Dynamic user model ref
    required: [true, 'Please provide user ID']
  },
  userModel: {
    type: String,
    required: [true, 'Please provide user model'],
    enum: ['Admin', 'Doctor', 'LabAssistant', 'Receptionist']
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },errorMessage: String
}, {
  timestamps: true
});

// Add text index for search
auditLogSchema.index({
  'action': 'text',
  'entity': 'text',
  'changes': 'text'
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
