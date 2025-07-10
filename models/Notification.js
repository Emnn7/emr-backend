const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['Doctor', 'LabAssistant', 'Admin', 'Receptionist']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['Doctor', 'LabAssistant', 'Admin', 'Receptionist']
  },
  type: {
    type: String,
    required: true,
    enum: ['new-lab-order', 'report-verification', 'system-alert', 'lab-order-paid']
  },
  message: {
    type: String,
    required: true
  },
  relatedEntity: {
    type: String,
    enum: ['LabOrder', 'LabReport', 'VitalSigns', null]
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread'
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;