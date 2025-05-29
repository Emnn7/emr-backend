const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // General Clinic Information
  clinicName: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  workingHours: { type: String, required: true },
  timezone: { type: String, required: true, default: 'America/New_York' },

  // Appointment Settings
  appointmentInterval: { type: Number, required: true, min: 10, max: 120 }, // minutes
  enableOnlineBooking: { type: Boolean, default: true },
  minCancelNotice: { type: Number, required: true, min: 1 }, // hours
  maxFutureBooking: { type: Number, required: true, min: 1 }, // days
  appointmentSlotDuration: { type: Number, default: 30, min: 5, max: 120 },

  // Notification Settings
  enableSMSNotifications: { type: Boolean, default: false },
  enableEmailNotifications: { type: Boolean, default: true },
  reminderLeadTime: { type: Number, required: true, min: 1 }, // hours

  // Billing Settings
  currency: { type: String, required: true, default: 'USD' },
  taxRate: { type: Number, required: true, min: 0, max: 100 },
  paymentMethods: [{ type: String }],
  invoicePrefix: { type: String, required: true },
  billingRates: {
    consultation: { type: Number, default: 100 },
    bloodTest: { type: Number, default: 50 }
  },

  // Report Templates
  reportTemplates: {
    default: {
      header: { type: String, default: '' },
      footer: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
      styles: { type: Object, default: {} }
    },
    labReport: {
      header: { type: String, default: '' },
      footer: { type: String, default: '' },
      includeNormalRanges: { type: Boolean, default: true },
      includeInterpretation: { type: Boolean, default: true }
    }
  },

  // Procedure Pricing
  procedurePricing: [{
    name: { type: String, required: true },
    code: { type: String, required: true },
    category: { type: String, required: true },
    basePrice: { type: Number, required: true },
    duration: { type: Number, required: true }, // minutes
    isActive: { type: Boolean, default: true }
  }],

  // Time Slots
  timeSlots: {
    morningStart: { type: String, default: '08:00' },
    morningEnd: { type: String, default: '12:00' },
    afternoonStart: { type: String, default: '13:00' },
    afternoonEnd: { type: String, default: '17:00' },
    eveningStart: { type: String, default: '17:00' },
    eveningEnd: { type: String, default: '20:00' }
  },

  // Metadata
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure there's only one settings document
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      clinicName: '',
      address: '',
      phone: '',
      email: '',
      workingHours: '',
      timezone: 'America/New_York',
      appointmentInterval: 30,
      minCancelNotice: 1,
      maxFutureBooking: 30,
      reminderLeadTime: 1,
      currency: 'USD',
      taxRate: 0,
      invoicePrefix: 'INV'
    });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
