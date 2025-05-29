const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Load env vars
dotenv.config({ path: './.env' });

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Load models
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const LabAssistant = require('../models/LabAssistant');
const Receptionist = require('../models/Receptionist');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');
const LabReport = require('../models/LabReport');
const Billing = require('../models/Billing');
const Payment = require('../models/Payment');
const VitalSigns = require('../models/VitalSigns');
const AuditLog = require('../models/AuditLog');

const backupData = async () => {
  try {
    const backupDir = path.join(__dirname, '../backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, timestamp);

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      await mkdir(backupDir);
    }

    // Create timestamped backup directory
    await mkdir(backupPath);

    // Define models to backup
    const models = [
      { name: 'admin', model: Admin },
      { name: 'doctor', model: Doctor },
      { name: 'labAssistant', model: LabAssistant },
      { name: 'receptionist', model: Receptionist },
      { name: 'patient', model: Patient },
      { name: 'appointment', model: Appointment },
      { name: 'prescription', model: Prescription },
      { name: 'labOrder', model: LabOrder },
      { name: 'labReport', model: LabReport },
      { name: 'billing', model: Billing },
      { name: 'payment', model: Payment },
      { name: 'vitalSigns', model: VitalSigns },
      { name: 'auditLog', model: AuditLog }
    ];

    // Backup each model
    for (const { name, model } of models) {
      const data = await model.find().lean();
      const filePath = path.join(backupPath, `${name}.json`);
      await writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`Backed up ${data.length} ${name} records`);
    }

    console.log(`Backup completed to ${backupPath}`);
    process.exit();
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
};

backupData();