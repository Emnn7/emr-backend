const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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

const importData = async () => {
  try {
    const dataPath = path.join(__dirname, 'data');
    const files = fs.readdirSync(dataPath);

    for (const file of files) {
      const modelName = file.split('.')[0];
      const Model = {
        admin: Admin,
        doctor: Doctor,
        labAssistant: LabAssistant,
        receptionist: Receptionist,
        patient: Patient,
        appointment: Appointment,
        prescription: Prescription,
        labOrder: LabOrder,
        labReport: LabReport,
        billing: Billing,
        payment: Payment,
        vitalSigns: VitalSigns
      }[modelName];

      if (!Model) continue;

      const fileData = fs.readFileSync(path.join(dataPath, file));
      const data = JSON.parse(fileData);

      await Model.deleteMany();
      await Model.insertMany(data);

      console.log(`Imported ${data.length} ${modelName} records`);
    }

    console.log('Data Imported!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const deleteData = async () => {
  try {
    await Admin.deleteMany();
    await Doctor.deleteMany();
    await LabAssistant.deleteMany();
    await Receptionist.deleteMany();
    await Patient.deleteMany();
    await Appointment.deleteMany();
    await Prescription.deleteMany();
    await LabOrder.deleteMany();
    await LabReport.deleteMany();
    await Billing.deleteMany();
    await Payment.deleteMany();
    await VitalSigns.deleteMany();

    console.log('Data Deleted!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
}