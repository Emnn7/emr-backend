const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateInvoice = async (billing) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoice-${billing._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../public/reports/${fileName}`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text('Medical Invoice', { align: 'center' })
      .moveDown();

    // Hospital Info
    doc
      .fontSize(12)
      .text('Hospital Name', { align: 'center' })
      .text('123 Hospital St, City', { align: 'center' })
      .text('Phone: (123) 456-7890', { align: 'center' })
      .moveDown();

    // Patient Info
    doc
      .fontSize(14)
      .text('Patient Information:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Name: ${billing.patient.firstName} ${billing.patient.lastName}`)
      .text(`Address: ${billing.patient.address}`)
      .text(`Phone: ${billing.patient.phone}`)
      .moveDown();

    // Invoice Details
    doc
      .fontSize(14)
      .text('Invoice Details:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Invoice Number: ${billing._id}`)
      .text(`Date: ${billing.createdAt.toLocaleDateString()}`)
      .text(`Status: ${billing.status}`)
      .moveDown();

    // Items Table
    doc
      .fontSize(14)
      .text('Services:', { underline: true })
      .moveDown(0.5);

    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, doc.y);
    doc.text('Quantity', 300, doc.y, { width: 50, align: 'right' });
    doc.text('Price', 350, doc.y, { width: 80, align: 'right' });
    doc.text('Total', 430, doc.y, { width: 80, align: 'right' });
    doc.moveDown(0.5);
    doc.font('Helvetica');

    // Table Rows
    let y = doc.y;
    billing.items.forEach((item, i) => {
      doc.text(item.description, 50, y);
      doc.text(item.quantity.toString(), 300, y, { width: 50, align: 'right' });
      doc.text(`$${item.unitPrice.toFixed(2)}`, 350, y, { width: 80, align: 'right' });
      doc.text(`$${item.total.toFixed(2)}`, 430, y, { width: 80, align: 'right' });
      y += 20;
    });

    doc.moveTo(50, y).lineTo(510, y).stroke();
    y += 10;

    // Totals
    doc.font('Helvetica-Bold');
    doc.text('Subtotal:', 350, y, { width: 80, align: 'right' });
    doc.text(`$${billing.subtotal.toFixed(2)}`, 430, y, { width: 80, align: 'right' });
    y += 20;

    if (billing.tax > 0) {
      doc.text('Tax:', 350, y, { width: 80, align: 'right' });
      doc.text(`$${billing.tax.toFixed(2)}`, 430, y, { width: 80, align: 'right' });
      y += 20;
    }

    if (billing.discount > 0) {
      doc.text('Discount:', 350, y, { width: 80, align: 'right' });
      doc.text(`-$${billing.discount.toFixed(2)}`, 430, y, { width: 80, align: 'right' });
      y += 20;
    }

    doc.text('Total:', 350, y, { width: 80, align: 'right' });
    doc.text(`$${billing.total.toFixed(2)}`, 430, y, { width: 80, align: 'right' });
    y += 30;

    // Footer
    doc
      .font('Helvetica')
      .fontSize(10)
      .text('Thank you for choosing our hospital.', 50, y, {
        align: 'center',
        width: 460
      });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

exports.generatePrescription = async (prescription) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `prescription-${prescription._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../public/reports/${fileName}`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text('Medical Prescription', { align: 'center' })
      .moveDown();

    // Hospital Info
    doc
      .fontSize(12)
      .text('Hospital Name', { align: 'center' })
      .text('123 Hospital St, City', { align: 'center' })
      .text('Phone: (123) 456-7890', { align: 'center' })
      .moveDown();

    // Patient Info
    doc
      .fontSize(14)
      .text('Patient Information:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Name: ${prescription.patient.firstName} ${prescription.patient.lastName}`)
      .text(`Gender: ${prescription.patient.gender}`)
  .text(`Date of Birth: ${prescription.patient.dateOfBirth ? prescription.patient.dateOfBirth.toDateString() : 'N/A'}`)
  .moveDown();

    // Prescription Info
    doc
      .fontSize(14)
      .text('Prescription Details:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Prescription ID: ${prescription._id}`)
      .text(`Date: ${prescription.createdAt.toLocaleDateString()}`)
      .text(`Prescribing Doctor: Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`)
      .text(`Specialization: ${prescription.doctor.specialization}`)
      .text(`License: ${prescription.doctor.licenseNumber}`)
      .moveDown();

    // Diagnosis
    if (prescription.diagnosis) {
      doc
        .fontSize(14)
        .text('Diagnosis:', { underline: true })
        .moveDown(0.5)
        .fontSize(12)
        .text(prescription.diagnosis)
        .moveDown();
    }

    // Medications
    doc
      .fontSize(14)
      .text('Medications:', { underline: true })
      .moveDown(0.5);

    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('Medication', 50, doc.y);
    doc.text('Dosage', 200, doc.y);
    doc.text('Frequency', 300, doc.y);
    doc.text('Duration', 400, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica');

    // Table Rows
    let y = doc.y;
    prescription.medications.forEach((med, i) => {
      doc.text(med.name, 50, y);
      doc.text(med.dosage, 200, y);
      doc.text(med.frequency, 300, y);
      doc.text(med.duration, 400, y);
      
      if (med.instructions) {
        y += 20;
        doc.fontSize(10).text(`Instructions: ${med.instructions}`, 50, y);
      }
      
      y += 25;
    });

    // Notes
    if (prescription.notes) {
      doc
        .fontSize(14)
        .text('Additional Notes:', { underline: true }, 50, y + 10)
        .moveDown(0.5)
        .fontSize(12)
        .text(prescription.notes, { width: 460 })
        .moveDown();
    }

    // Footer
    doc
      .fontSize(10)
      .text('This prescription is valid for 30 days from the date of issue.', 50, doc.y, {
        align: 'center',
        width: 460
      })
      .moveDown()
      .text('Doctor Signature: ________________________', 300, doc.y, {
        align: 'right'
      });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

exports.generateLabReport = async (labReport) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `lab-report-${labReport._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../public/reports/${fileName}`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text('Laboratory Test Report', { align: 'center' })
      .moveDown();

    // Hospital Info
    doc
      .fontSize(12)
      .text('Hospital Laboratory', { align: 'center' })
      .text('123 Hospital St, City', { align: 'center' })
      .text('Phone: (123) 456-7890', { align: 'center' })
      .moveDown();

    // Patient Info
    doc
      .fontSize(14)
      .text('Patient Information:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Name: ${labReport.patient.firstName} ${labReport.patient.lastName}`)
      .text(`Gender: ${labReport.patient.gender}`)
      .text(`Date of Birth: ${labReport.patient.dateOfBirth.toDateString()}`)
      .moveDown();

    // Report Info
    doc
      .fontSize(14)
      .text('Test Details:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Report ID: ${labReport._id}`)
      .text(`Test Name: ${labReport.testName}`)
      .text(`Test Code: ${labReport.testCode}`)
      .text(`Date Collected: ${labReport.createdAt.toLocaleDateString()}`)
      .text(`Performed By: ${labReport.performedBy.firstName} ${labReport.performedBy.lastName}`);

    if (labReport.verifiedBy) {
      doc.text(`Verified By: ${labReport.verifiedBy.firstName} ${labReport.verifiedBy.lastName}`);
    }

    doc.text(`Status: ${labReport.status}`)
      .moveDown();

    // Results
    doc
      .fontSize(14)
      .text('Test Results:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Result: ${labReport.result}`);

    if (labReport.unit) {
      doc.text(`Unit: ${labReport.unit}`);
    }

    if (labReport.normalRange) {
      doc.text(`Normal Range: ${labReport.normalRange}`);
    }

    if (labReport.abnormalFlag) {
      doc.text(`Flag: ${labReport.abnormalFlag}`);
    }

    doc.moveDown();

    // Notes
    if (labReport.notes) {
      doc
        .fontSize(14)
        .text('Notes:', { underline: true })
        .moveDown(0.5)
        .fontSize(12)
        .text(labReport.notes, { width: 460 })
        .moveDown();
    }

    // Footer
    doc
      .fontSize(10)
      .text('This report is for medical purposes only. Please consult your doctor for interpretation.', 50, doc.y, {
        align: 'center',
        width: 460
      });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

exports.generateMedicalReport = async ({ patient, appointments, prescriptions, labOrders, labReports, vitalSigns }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `medical-report-${patient._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../public/reports/${fileName}`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text('Comprehensive Medical Report', { align: 'center' })
      .moveDown();

    // Hospital Info
    doc
      .fontSize(12)
      .text('Hospital Name', { align: 'center' })
      .text('123 Hospital St, City', { align: 'center' })
      .text('Phone: (123) 456-7890', { align: 'center' })
      .moveDown();

    // Patient Info
    doc
      .fontSize(14)
      .text('Patient Information:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Name: ${patient.firstName} ${patient.lastName}`)
      .text(`Gender: ${patient.gender}`)
      .text(`Date of Birth: ${patient.dateOfBirth.toDateString()}`)
      .text(`Phone: ${patient.phone}`)
      .text(`Address: ${patient.address}`)
      .moveDown();

    // Medical History
    if (patient.medicalHistory && patient.medicalHistory.length > 0) {
      doc
        .fontSize(14)
        .text('Medical History:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      patient.medicalHistory.forEach((history, i) => {
        doc.text(`- ${history.condition} (${history.status})`);
        if (history.diagnosisDate) {
          doc.text(`  Diagnosed: ${history.diagnosisDate.toDateString()}`);
        }
        doc.moveDown(0.5);
      });
    }

    // Allergies
    if (patient.allergies && patient.allergies.length > 0) {
      doc
        .fontSize(14)
        .text('Allergies:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      patient.allergies.forEach((allergy, i) => {
        doc.text(`- ${allergy.name} (${allergy.severity})`);
        if (allergy.reaction) {
          doc.text(`  Reaction: ${allergy.reaction}`);
        }
        doc.moveDown(0.5);
      });
    }

    // Current Medications
    if (patient.medications && patient.medications.length > 0) {
      doc
        .fontSize(14)
        .text('Current Medications:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      patient.medications.forEach((med, i) => {
        doc.text(`- ${med.name}`);
        doc.text(`  Dosage: ${med.dosage}, Frequency: ${med.frequency}`);
        if (med.startDate) {
          doc.text(`  Start Date: ${med.startDate.toDateString()}`);
        }
        if (med.endDate) {
          doc.text(`  End Date: ${med.endDate.toDateString()}`);
        }
        if (med.prescribedBy) {
          doc.text(`  Prescribed By: ${med.prescribedBy}`);
        }
        doc.moveDown(0.5);
      });
    }

    // Appointments
    if (appointments && appointments.length > 0) {
      doc.addPage();
      doc
        .fontSize(14)
        .text('Appointment History:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      appointments.forEach((appt, i) => {
        doc.text(`- ${appt.date.toDateString()} at ${appt.time}`);
        doc.text(`  Doctor: Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`);
        doc.text(`  Specialization: ${appt.doctor.specialization}`);
        doc.text(`  Reason: ${appt.reason}`);
        doc.text(`  Status: ${appt.status}`);
        if (appt.notes) {
          doc.text(`  Notes: ${appt.notes}`);
        }
        doc.moveDown(0.5);
      });
    }

    // Vital Signs
    if (vitalSigns && vitalSigns.length > 0) {
      doc.addPage();
      doc
        .fontSize(14)
        .text('Vital Signs History:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      vitalSigns.forEach((vital, i) => {
        doc.text(`- Recorded on ${vital.createdAt.toLocaleString()} by ${vital.recordedBy.firstName} ${vital.recordedBy.lastName}`);
        
        if (vital.temperature && vital.temperature.value) {
          doc.text(`  Temperature: ${vital.temperature.value} ${vital.temperature.unit}`);
        }
        
        if (vital.bloodPressure && vital.bloodPressure.systolic) {
          doc.text(`  Blood Pressure: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} ${vital.bloodPressure.unit}`);
        }
        
        if (vital.heartRate && vital.heartRate.value) {
          doc.text(`  Heart Rate: ${vital.heartRate.value} ${vital.heartRate.unit}`);
        }
        
        if (vital.oxygenSaturation && vital.oxygenSaturation.value) {
          doc.text(`  Oxygen Saturation: ${vital.oxygenSaturation.value} ${vital.oxygenSaturation.unit}`);
        }
        
        if (vital.bmi && vital.bmi.value) {
          doc.text(`  BMI: ${vital.bmi.value} (${vital.bmi.classification})`);
        }
        
        if (vital.notes) {
          doc.text(`  Notes: ${vital.notes}`);
        }
        
        doc.moveDown(0.5);
      });
    }

    // Lab Orders
    if (labOrders && labOrders.length > 0) {
      doc.addPage();
      doc
        .fontSize(14)
        .text('Laboratory Test Orders:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      labOrders.forEach((order, i) => {
        doc.text(`- Order #${order._id} from ${order.createdAt.toLocaleString()}`);
        doc.text(`  Ordered by: Dr. ${order.doctor.firstName} ${order.doctor.lastName}`);
        doc.text(`  Status: ${order.status}`);
        doc.text('  Tests:');
        
        order.tests.forEach((test, j) => {
          doc.text(`    ${test.name} (${test.status})`);
        });
        
        if (order.notes) {
          doc.text(`  Notes: ${order.notes}`);
        }
        
        doc.moveDown(0.5);
      });
    }

    // Lab Reports
    if (labReports && labReports.length > 0) {
      doc.addPage();
      doc
        .fontSize(14)
        .text('Laboratory Test Results:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      labReports.forEach((report, i) => {
        doc.text(`- ${report.testName} (${report.testCode})`);
        doc.text(`  Result: ${report.result} ${report.unit ? report.unit : ''}`);
        
        if (report.normalRange) {
          doc.text(`  Normal Range: ${report.normalRange}`);
        }
        
        if (report.abnormalFlag) {
          doc.text(`  Flag: ${report.abnormalFlag}`);
        }
        
        doc.text(`  Performed by: ${report.performedBy.firstName} ${report.performedBy.lastName}`);
        
        if (report.verifiedBy) {
          doc.text(`  Verified by: ${report.verifiedBy.firstName} ${report.verifiedBy.lastName}`);
        }
        
        doc.text(`  Status: ${report.status}`);
        doc.text(`  Date: ${report.createdAt.toLocaleString()}`);
        
        if (report.notes) {
          doc.text(`  Notes: ${report.notes}`);
        }
        
        doc.moveDown(0.5);
      });
    }

    // Prescriptions
    if (prescriptions && prescriptions.length > 0) {
      doc.addPage();
      doc
        .fontSize(14)
        .text('Prescription History:', { underline: true })
        .moveDown(0.5)
        .fontSize(12);

      prescriptions.forEach((presc, i) => {
        doc.text(`- Prescription #${presc._id} from ${presc.createdAt.toLocaleString()}`);
        doc.text(`  Prescribed by: Dr. ${presc.doctor.firstName} ${presc.doctor.lastName}`);
        doc.text(`  Status: ${presc.status}`);
        
        if (presc.diagnosis) {
          doc.text(`  Diagnosis: ${presc.diagnosis}`);
        }
        
        doc.text('  Medications:');
        
        presc.medications.forEach((med, j) => {
          doc.text(`    ${med.name}`);
          doc.text(`      Dosage: ${med.dosage}`);
          doc.text(`      Frequency: ${med.frequency}`);
          doc.text(`      Duration: ${med.duration}`);
          
          if (med.instructions) {
            doc.text(`      Instructions: ${med.instructions}`);
          }
        });
        
        if (presc.notes) {
          doc.text(`  Notes: ${presc.notes}`);
        }
        
        doc.moveDown(0.5);
      });
    }

    // Footer
    doc
      .fontSize(10)
      .text('End of Report', { align: 'center' })
      .text('Generated on ' + new Date().toLocaleString(), { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

exports.generateReceipt = async (payment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `receipt-${payment._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../public/reports/${fileName}`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text('Payment Receipt', { align: 'center' })
      .moveDown();

    // Hospital Info
    doc
      .fontSize(12)
      .text('Hospital Name', { align: 'center' })
      .text('123 Hospital St, City', { align: 'center' })
      .text('Phone: (123) 456-7890', { align: 'center' })
      .moveDown();

    // Patient Info
    doc
      .fontSize(14)
      .text('Patient Information:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Name: ${payment.patient.firstName} ${payment.patient.lastName}`)
      .text(`Address: ${payment.patient.address}`)
      .text(`Phone: ${payment.patient.phone}`)
      .moveDown();

    // Payment Details
    doc
      .fontSize(14)
      .text('Payment Details:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Receipt Number: ${payment._id}`)
      .text(`Date: ${payment.createdAt.toLocaleString()}`)
      .text(`Payment Method: ${payment.paymentMethod}`)
      .text(`Transaction ID: ${payment.transactionId || 'N/A'}`)
      .text(`Status: ${payment.status}`)
      .moveDown();

    // Billing Info
    doc
      .fontSize(14)
      .text('Billing Information:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`Billing ID: ${payment.billing._id}`)
      .text(`Total Amount: $${payment.billing.total.toFixed(2)}`)
      .text(`Amount Paid: $${payment.amount.toFixed(2)}`)
      .moveDown();

    // Processed By
    doc
      .fontSize(14)
      .text('Processed By:', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .text(`${payment.processedBy.firstName} ${payment.processedBy.lastName}`)
      .text(`Role: ${payment.processedByModel}`)
      .moveDown();

    // Notes
    if (payment.notes) {
      doc
        .fontSize(14)
        .text('Notes:', { underline: true })
        .moveDown(0.5)
        .fontSize(12)
        .text(payment.notes)
        .moveDown();
    }

    // Footer
    doc
      .fontSize(10)
      .text('Thank you for your payment.', { align: 'center' })
      .text('This is your official receipt. Please keep it for your records.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};