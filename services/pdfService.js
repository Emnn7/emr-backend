const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateInvoice = async (billing) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `invoice-${billing._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../public/reports/${fileName}`);

   // Create directory if it doesn't exist
const ensureDirectoryExists = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Unified receipt generator
exports.generateReceipt = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `receipt-${data.receiptNumber}.pdf`;
      const filePath = path.join(__dirname, '../public/receipts', fileName);
      
      ensureDirectoryExists(filePath);

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Receipt', { align: 'center' });
      doc.moveDown();

      // Patient info
      doc.fontSize(14)
        .text(`Patient: ${data.patient.name}`)
        .text(`Date: ${new Date(data.date).toLocaleDateString()}`)
        .text(`Receipt #: ${data.receiptNumber}`);
      doc.moveDown();

      // Services table
      doc.fontSize(12).text('Services:', { underline: true });
      doc.moveDown(0.5);
      
      let yPos = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Description', 50, yPos);
      doc.text('Amount', 400, yPos, { width: 100, align: 'right' });
      doc.font('Helvetica');
      
      data.services.forEach(service => {
        yPos += 20;
        doc.text(service.description, 50, yPos);
        doc.text(`$${service.amount.toFixed(2)}`, 400, yPos, { width: 100, align: 'right' });
      });
      
      // Total
      yPos += 30;
      doc.font('Helvetica-Bold');
      doc.text('Total:', 350, yPos);
      doc.text(`$${data.total.toFixed(2)}`, 400, yPos, { width: 100, align: 'right' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);

    } catch (err) {
      console.error('PDF generation error:', err);
      reject(err);
    }
  });
};
    

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
      .text(`Phone: ${labReport.patient?.phone || 'Not specified'}`)
      .moveDown();

    // Report Info
doc
  .fontSize(14)
  .text('Test Details:', { underline: true })
  .moveDown(0.5)
  .fontSize(12)
  .text(`Report ID: ${labReport._id}`)
  .text(`Date Collected: ${labReport.createdAt.toLocaleDateString()}`)
  .text(`Performed By: ${labReport.performedBy.firstName} ${labReport.performedBy.lastName}`);

if (labReport.verifiedBy) {
  doc.text(`Verified By: ${labReport.verifiedBy.firstName} ${labReport.verifiedBy.lastName}`);
}

doc.text(`Status: ${labReport.status}`)
  .moveDown();

// Results section - handle multiple tests
doc
  .fontSize(14)
  .text('Test Results:', { underline: true })
  .moveDown(0.5);

if (labReport.tests && labReport.tests.length > 0) {
  labReport.tests.forEach((test, index) => {
    doc
      .fontSize(12)
      .text(`Test ${index + 1}: ${test.name || 'N/A'}`, { indent: 10 })
      .text(`Result: ${test.result || 'N/A'}`, { indent: 10 });
    
    if (test.unit) {
      doc.text(`Unit: ${test.unit}`, { indent: 10 });
    }
    
    if (test.normalRange) {
      doc.text(`Normal Range: ${test.normalRange}`, { indent: 10 });
    }
    
    if (test.abnormalFlag) {
      doc.text(`Flag: ${test.abnormalFlag}`, { indent: 10 });
    }
    
    doc.moveDown();
  });
} else {
  doc
    .fontSize(12)
    .text('No test results available', { indent: 10 });
}

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

exports.generateMedicalReport = async ({ patient, medicalHistory, appointments, prescriptions, labOrders, labReports, vitalSigns }) => {
  return new Promise((resolve, reject) => {
    // Document setup with professional settings
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: `Medical Report for ${patient.firstName} ${patient.lastName}`,
        Author: 'Hospital Management System',
        Creator: 'Hospital Management System'
      }
    });

    const fileName = `medical-report-${patient._id}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../public/reports/${fileName}`);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ================ DESIGN CONSTANTS ================
    const colors = {
      primary: '#005b96',       // Dark blue
      secondary: '#339966',     // Green
      accent: '#cc3300',        // Red
      lightGray: '#f5f5f5',
      mediumGray: '#dddddd',
      darkGray: '#333333',
      text: '#333333'
    };

    const fonts = {
      header: 'Helvetica-Bold',
      subheader: 'Helvetica-Bold',
      body: 'Helvetica',
      bold: 'Helvetica-Bold'
    };

    const spacing = {
      section: 15,
      subsection: 10,
      paragraph: 8,
      line: 5
    };

    // ================ HEADER SECTION ================
    // Hospital Information (compact version)
    doc
      .fillColor(colors.primary)
      .font(fonts.header)
      .fontSize(14)
      .text('GENERAL HOSPITAL', { 
        align: 'center',
        underline: false
      });

    doc
      .font(fonts.body)
      .fontSize(8)
      .fillColor(colors.darkGray)
      .text('123 Medical Center ST 12345 • Phone: (143) 123-4567', { align: 'center' })
      .moveDown(spacing.section);

    // Header divider
    doc
      .strokeColor(colors.mediumGray)
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(spacing.section);

    // ================ PATIENT INFORMATION SECTION ================
doc
  .fillColor(colors.primary)
  .font(fonts.subheader)
  .fontSize(12)
  .text('PATIENT INFORMATION', { underline: false });

const patientStartY = doc.y + 10; // slight offset for spacing

doc.moveDown(spacing.subsection);

// Background for patient info section
doc
  .fillColor(colors.lightGray)
  .rect(50, patientStartY, 500, 80)
  .fill();

// Column 1
const col1X = 50;
const col2X = 300;

doc
  .font(fonts.bold)
  .fontSize(10)
  .fillColor(colors.darkGray)
  .text('Patient Name:', col1X, patientStartY + 10)
  .font(fonts.body)
  .text(`${patient.firstName} ${patient.lastName}`, col1X + 80, patientStartY + 10);

doc
  .font(fonts.bold)
  .text('Date of Birth:', col1X, patientStartY + 25)
  .font(fonts.body)
  .text(patient.dateOfBirth.toLocaleDateString(), col1X + 80, patientStartY + 25);

doc
  .font(fonts.bold)
  .text('Gender:', col1X, patientStartY + 40)
  .font(fonts.body)
  .text(patient.gender, col1X + 80, patientStartY + 40);

doc
  .font(fonts.bold)
  .text('Blood Type:', col1X, patientStartY + 55)
  .font(fonts.body)
  .text(patient.bloodType || 'Not specified', col1X + 80, patientStartY + 55);

// Column 2
doc
  .font(fonts.bold)
  .text('Patient ID:', col2X, patientStartY + 10)
  .font(fonts.body)
  .text(patient._id.toString(), col2X + 80, patientStartY + 10);

doc
  .font(fonts.bold)
  .text('Phone:', col2X, patientStartY + 25)
  .font(fonts.body)
  .text(patient.phone, col2X + 80, patientStartY + 25);

doc
  .font(fonts.bold)
  .text('Address:', col2X, patientStartY + 40)
  .font(fonts.body)
  .text(patient.address, col2X + 80, patientStartY + 40, { width: 200, lineBreak: false });

doc.y = patientStartY + 90;
doc.moveDown(spacing.section);

    // ================ MEDICAL HISTORY SECTION ================
    if (medicalHistory && medicalHistory.length > 0) {
      doc
        .fillColor(colors.primary)
        .font(fonts.subheader)
        .fontSize(11)
        .text('MEDICAL HISTORY', { underline: false })
        .moveDown(spacing.subsection);

      medicalHistory.forEach((history, index) => {
        // Check space and add page if needed (keeping header with first row)
        if (doc.y > 650) {
          doc.addPage();
        }

        // History item header
        doc
          .fillColor(colors.primary)
          .rect(50, doc.y, 500, 18)
          .fill();

        doc
          .font(fonts.subheader)
          .fontSize(9)
          .fillColor('#ffffff')
          .text(`MEDICAL HISTORY RECORD #${index + 1} - ${new Date(history.createdAt).toLocaleDateString()}`, 55, doc.y + 4);

        doc.y += 20;

        // Compact display of medical history
        const historyFields = [
          { label: 'Diagnosis', value: history.diagnosis },
          { label: 'Symptoms', value: history.symptoms }
        ];

        historyFields.forEach(field => {
          if (field.value) {
            doc
              .font(fonts.bold)
              .fontSize(8)
              .fillColor(colors.darkGray)
              .text(`${field.label}:`, 55, doc.y)
              .font(fonts.body)
              .text(field.value, 120, doc.y, { width: 430 });
            doc.y += 12;
          }
        });

        // Allergies table (compact version)
        if (history.allergies && history.allergies.length > 0) {
          doc
            .font(fonts.bold)
            .fontSize(8)
            .text('Allergies:', 55, doc.y)
            .moveDown(0.3);

          // Check space for table (header + at least 2 rows)
          if (doc.y > 700 - (15 + 30)) {
            doc.addPage();
          }

          // Table header
          const allergyHeaderY = doc.y;
          doc
            .fillColor(colors.mediumGray)
            .rect(55, allergyHeaderY, 490, 12)
            .fill();

          doc
            .fontSize(7)
            .font(fonts.bold)
            .fillColor(colors.darkGray)
            .text('Allergen', 60, allergyHeaderY + 3)
            .text('Reaction', 180, allergyHeaderY + 3)
            .text('Severity', 300, allergyHeaderY + 3)
            .text('Notes', 380, allergyHeaderY + 3);

          doc.y = allergyHeaderY + 12;

          // Table rows
          history.allergies.forEach((allergy, allergyIndex) => {
            // Keep header and at least one row together
            if (allergyIndex > 0 && doc.y > 700 - 12) {
              doc.addPage();
              // Repeat header on new page
              doc
                .fillColor(colors.mediumGray)
                .rect(55, doc.y, 490, 12)
                .fill();

              doc
                .fontSize(7)
                .font(fonts.bold)
                .fillColor(colors.darkGray)
                .text('Allergen', 60, doc.y + 3)
                .text('Reaction', 180, doc.y + 3)
                .text('Severity', 300, doc.y + 3)
                .text('Notes', 380, doc.y + 3);

              doc.y += 12;
            }

            const rowY = doc.y;
            
            // Alternate row colors
            if (allergyIndex % 2 === 0) {
              doc
                .fillColor(colors.lightGray)
                .rect(55, rowY, 490, 12)
                .fill();
            }

            doc
              .fontSize(7)
              .font(fonts.body)
              .fillColor(colors.darkGray)
              .text(allergy.name || 'N/A', 60, rowY + 3)
              .text(allergy.reaction || 'N/A', 180, rowY + 3)
              .text(allergy.severity || 'N/A', 300, rowY + 3)
              .text(allergy.notes || 'N/A', 380, rowY + 3, { width: 160 });

            doc.y = rowY + 12;
          });

          doc.moveDown(0.5);
        }

        // Current Medications table (compact version)
        if (history.currentMedications && history.currentMedications.length > 0) {
          doc
            .font(fonts.bold)
            .fontSize(8)
            .text('Current Medications:', 55, doc.y)
            .moveDown(0.3);

          // Check space for table
          if (doc.y > 700 - (15 + 30)) {
            doc.addPage();
          }

          // Table header
          const medHeaderY = doc.y;
          doc
            .fillColor(colors.mediumGray)
            .rect(55, medHeaderY, 490, 12)
            .fill();

          doc
            .fontSize(7)
            .font(fonts.bold)
            .fillColor(colors.darkGray)
            .text('Medication', 60, medHeaderY + 3)
            .text('Dosage', 180, medHeaderY + 3)
            .text('Frequency', 280, medHeaderY + 3)
            .text('Prescribed By', 380, medHeaderY + 3);

          doc.y = medHeaderY + 12;

          // Table rows
          history.currentMedications.forEach((med, medIndex) => {
            // Keep header with at least one row
            if (medIndex > 0 && doc.y > 700 - 12) {
              doc.addPage();
              // Repeat header
              doc
                .fillColor(colors.mediumGray)
                .rect(55, doc.y, 490, 12)
                .fill();

              doc
                .fontSize(7)
                .font(fonts.bold)
                .fillColor(colors.darkGray)
                .text('Medication', 60, doc.y + 3)
                .text('Dosage', 180, doc.y + 3)
                .text('Frequency', 280, doc.y + 3)
                .text('Prescribed By', 380, doc.y + 3);

              doc.y += 12;
            }

            const rowY = doc.y;
            
            // Alternate row colors
            if (medIndex % 2 === 0) {
              doc
                .fillColor(colors.lightGray)
                .rect(55, rowY, 490, 12)
                .fill();
            }

            doc
              .fontSize(7)
              .font(fonts.body)
              .fillColor(colors.darkGray)
              .text(med.name || 'N/A', 60, rowY + 3)
              .text(med.dosage || 'N/A', 180, rowY + 3)
              .text(med.frequency || 'N/A', 280, rowY + 3)
              .text(med.prescribedBy || 'N/A', 380, rowY + 3);

            doc.y = rowY + 12;
          });

          doc.moveDown(0.5);
        }

        // Lifestyle Factors (compact display)
        if (history.lifestyle) {
          const lifestyle = history.lifestyle;
          let lifestyleText = '';
          if (lifestyle.smoking) lifestyleText += 'Smoker, ';
          if (lifestyle.alcohol) lifestyleText += 'Alcohol Consumer, ';
          if (lifestyle.exerciseFrequency) lifestyleText += `Exercise: ${lifestyle.exerciseFrequency}, `;
          if (lifestyle.diet) lifestyleText += `Diet: ${lifestyle.diet}`;

          if (lifestyleText) {
            doc
              .font(fonts.bold)
              .fontSize(8)
              .text('Lifestyle:', 55, doc.y)
              .font(fonts.body)
              .text(lifestyleText.replace(/,\s*$/, ''), 120, doc.y);
            doc.y += 12;
          }
        }

        // Family History (compact)
        if (history.familyHistory) {
          doc
            .font(fonts.bold)
            .fontSize(8)
            .text('Family History:', 55, doc.y)
            .font(fonts.body)
            .text(history.familyHistory, 55, doc.y + 12, { width: 430 });
          doc.y += 24;
        }

        // Notes (compact)
        if (history.notes) {
          doc
            .font(fonts.bold)
            .fontSize(8)
            .text('Notes:', 55, doc.y)
            .font(fonts.body)
            .text(history.notes, 55, doc.y + 12, { width: 430 });
          doc.y += 24;
        }

        // Add page break if less than 1/4 page left
        if (doc.y > 700) doc.addPage();

        // Minimal divider between history items
        if (index < medicalHistory.length - 1) {
          doc
            .strokeColor(colors.mediumGray)
            .lineWidth(0.3)
            .moveTo(50, doc.y + 5)
            .lineTo(550, doc.y + 5)
            .stroke()
            .moveDown(spacing.subsection);
        }
      });
    }

    // ================ VITAL SIGNS SECTION ================
    if (vitalSigns && vitalSigns.length > 0) {
      // Add new page if less than 1/3 page remaining
      if (doc.y > 650) doc.addPage();

      doc
        .fillColor(colors.primary)
        .font(fonts.subheader)
        .fontSize(11)
        .text('VITAL SIGNS HISTORY', { underline: false })
        .moveDown(spacing.subsection);

      // Check space for table header + at least 2 rows
      if (doc.y > 700 - (15 + 24)) {
        doc.addPage();
      }

      // Compact table header
      const vitalHeaderY = doc.y;
      doc
        .fillColor(colors.mediumGray)
        .rect(50, vitalHeaderY, 500, 12)
        .fill();

      doc
        .fontSize(7)
        .font(fonts.bold)
        .fillColor(colors.darkGray)
        .text('Date', 55, vitalHeaderY + 3)
        .text('Temp', 110, vitalHeaderY + 3, { width: 40, align: 'right' })
        .text('BP', 160, vitalHeaderY + 3, { width: 60, align: 'right' })
        .text('HR', 230, vitalHeaderY + 3, { width: 40, align: 'right' })
        .text('SpO₂', 280, vitalHeaderY + 3, { width: 40, align: 'right' })
        .text('BMI', 330, vitalHeaderY + 3, { width: 40, align: 'right' })
        .text('Recorded By', 380, vitalHeaderY + 3, { width: 120, align: 'left' });

      doc.y = vitalHeaderY + 12;

      // Table rows
      vitalSigns.forEach((vital, index) => {
        // Keep header with at least one row
        if (index > 0 && doc.y > 700 - 12) {
          doc.addPage();
          // Repeat header
          doc
            .fillColor(colors.mediumGray)
            .rect(50, doc.y, 500, 12)
            .fill();

          doc
            .fontSize(7)
            .font(fonts.bold)
            .fillColor(colors.darkGray)
            .text('Date', 55, doc.y + 3)
            .text('Temp', 110, doc.y + 3, { width: 40, align: 'right' })
            .text('BP', 160, doc.y + 3, { width: 60, align: 'right' })
            .text('HR', 230, doc.y + 3, { width: 40, align: 'right' })
            .text('SpO₂', 280, doc.y + 3, { width: 40, align: 'right' })
            .text('BMI', 330, doc.y + 3, { width: 40, align: 'right' })
            .text('Recorded By', 380, doc.y + 3, { width: 120, align: 'left' });

          doc.y += 12;
        }

        const rowY = doc.y;
        
        // Alternate row colors
        if (index % 2 === 0) {
          doc
            .fillColor(colors.lightGray)
            .rect(50, rowY, 500, 12)
            .fill();
        }

        // Format blood pressure
        const bpText = vital.bloodPressure ? 
          `${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic}` : '--';

        // Format recorded by name
        const recordedByText = vital.recordedBy ? 
          `${vital.recordedBy.firstName?.charAt(0)}. ${vital.recordedBy.lastName}` : '--';

        doc
          .fontSize(7)
          .font(fonts.body)
          .fillColor(colors.darkGray)
          .text(new Date(vital.createdAt).toLocaleDateString(), 55, rowY + 3)
          .text(vital.temperature?.value?.toFixed(1) || '--', 110, rowY + 3, { width: 40, align: 'right' })
          .text(bpText, 160, rowY + 3, { width: 60, align: 'right' })
          .text(vital.heartRate?.value || '--', 230, rowY + 3, { width: 40, align: 'right' })
          .text(vital.oxygenSaturation?.value || '--', 280, rowY + 3, { width: 40, align: 'right' })
          .text(vital.bmi?.value?.toFixed(1) || '--', 330, rowY + 3, { width: 40, align: 'right' })
          .text(recordedByText, 380, rowY + 3, { width: 120, align: 'left' });

        doc.y = rowY + 12;
      });

      doc.moveDown(spacing.section);
    }

    // ================ PRESCRIPTIONS SECTION ================
    if (prescriptions && prescriptions.length > 0) {
      // Add new page if less than 1/3 page remaining
      if (doc.y > 650) doc.addPage();

      doc
        .fillColor(colors.primary)
        .font(fonts.subheader)
        .fontSize(11)
        .text('PRESCRIPTION HISTORY', { underline: false })
        .moveDown(spacing.subsection);

      prescriptions.forEach((prescription, index) => {
        // Check space for prescription header + basic info
        if (doc.y > 700 - 60) {
          doc.addPage();
        }

        // Compact prescription header
        doc
          .fillColor(colors.primary)
          .rect(50, doc.y, 500, 15)
          .fill();

        doc
          .font(fonts.subheader)
          .fontSize(8)
          .fillColor('#ffffff')
          .text(`PRESCRIPTION #${index + 1} - ${new Date(prescription.createdAt).toLocaleDateString()}`, 55, doc.y + 4);

        doc.y += 18;

        // Doctor info (compact)
        doc
          .font(fonts.bold)
          .fontSize(8)
          .fillColor(colors.darkGray)
          .text('Prescribed By:', 55, doc.y)
          .font(fonts.body)
          .text(`Dr. ${prescription.doctor.lastName} (${prescription.doctor.specialization})`, 120, doc.y);

        doc.y += 12;

        // Diagnosis (compact)
        if (prescription.diagnosis) {
          doc
            .font(fonts.bold)
            .text('Diagnosis:', 55, doc.y)
            .font(fonts.body)
            .text(prescription.diagnosis, 120, doc.y, { width: 400 });
          doc.y += 12;
        }

        // Medications table
        if (prescription.medications && prescription.medications.length > 0) {
          doc
            .font(fonts.bold)
            .text('Medications:', 55, doc.y)
            .moveDown(0.3);

          // Check space for table header + at least 2 rows
          if (doc.y > 700 - (12 + 24)) {
            doc.addPage();
          }

          // Table header
          const medHeaderY = doc.y;
          doc
            .fillColor(colors.mediumGray)
            .rect(55, medHeaderY, 490, 12)
            .fill();

          doc
            .fontSize(7)
            .font(fonts.bold)
            .fillColor(colors.darkGray)
            .text('Medication', 60, medHeaderY + 3)
            .text('Dosage', 200, medHeaderY + 3)
            .text('Frequency', 300, medHeaderY + 3)
            .text('Duration', 400, medHeaderY + 3);

          doc.y = medHeaderY + 12;

          // Table rows
          prescription.medications.forEach((med, medIndex) => {
            // Keep header with at least one row
            if (medIndex > 0 && doc.y > 700 - 12) {
              doc.addPage();
              // Repeat header
              doc
                .fillColor(colors.mediumGray)
                .rect(55, doc.y, 490, 12)
                .fill();

              doc
                .fontSize(7)
                .font(fonts.bold)
                .fillColor(colors.darkGray)
                .text('Medication', 60, doc.y + 3)
                .text('Dosage', 200, doc.y + 3)
                .text('Frequency', 300, doc.y + 3)
                .text('Duration', 400, doc.y + 3);

              doc.y += 12;
            }

            const rowY = doc.y;
            
            // Alternate row colors
            if (medIndex % 2 === 0) {
              doc
                .fillColor(colors.lightGray)
                .rect(55, rowY, 490, 12)
                .fill();
            }

            doc
              .fontSize(7)
              .font(fonts.body)
              .fillColor(colors.darkGray)
              .text(med.name || 'N/A', 60, rowY + 3)
              .text(med.dosage || 'N/A', 200, rowY + 3)
              .text(med.frequency || 'N/A', 300, rowY + 3)
              .text(med.duration || 'N/A', 400, rowY + 3);

            doc.y = rowY + 12;

            // Compact instructions display
            if (med.instructions) {
              doc
                .fontSize(6)
                .fillColor(colors.darkGray)
                .text(`Instructions: ${med.instructions}`, 60, doc.y + 2, { width: 430 });
              doc.y += 10;
            }
          });

          doc.moveDown(0.5);
        }

        // Notes (compact)
        if (prescription.notes) {
          doc
            .font(fonts.bold)
            .fontSize(8)
            .text('Notes:', 55, doc.y)
            .font(fonts.body)
            .text(prescription.notes, 55, doc.y + 10, { width: 430 });
          doc.y += 20;
        }

        // Add page if less than 1/4 page left
        if (doc.y > 700) doc.addPage();

        // Minimal divider
        if (index < prescriptions.length - 1) {
          doc
            .strokeColor(colors.mediumGray)
            .lineWidth(0.3)
            .moveTo(50, doc.y + 5)
            .lineTo(550, doc.y + 5)
            .stroke()
            .moveDown(spacing.subsection);
        }
      });
    }

    // ================ LAB RESULTS SECTION ================
    if (labReports && labReports.length > 0) {
      // Add new page if less than 1/3 page remaining
      if (doc.y > 650) doc.addPage();

      doc
        .fillColor(colors.primary)
        .font(fonts.subheader)
        .fontSize(11)
        .text('LABORATORY TEST RESULTS', { underline: false })
        .moveDown(spacing.subsection);

      labReports.forEach((report, index) => {
        // Check space for report header + basic info
        if (doc.y > 700 - 80) {
          doc.addPage();
        }

        // Compact report header
        doc
          .fillColor(colors.primary)
          .rect(50, doc.y, 500, 15)
          .fill();

        doc
          .font(fonts.subheader)
          .fontSize(8)
          .fillColor('#ffffff')
          .text(`LAB REPORT #${index + 1} - ${report.testName}`, 55, doc.y + 4);

        doc.y += 18;

        // Test details (compact)
        doc
          .font(fonts.bold)
          .fontSize(8)
          .fillColor(colors.darkGray)
          .text('Test Date:', 55, doc.y)
          .font(fonts.body)
          .text(new Date(report.createdAt).toLocaleDateString(), 120, doc.y);

        doc
          .font(fonts.bold)
          .text('Performed By:', 55, doc.y + 12)
          .font(fonts.body)
          .text(`${report.performedBy.lastName}`, 120, doc.y + 12);

        if (report.verifiedBy) {
          doc
            .font(fonts.bold)
            .text('Verified By:', 55, doc.y + 24)
            .font(fonts.body)
            .text(`${report.verifiedBy.lastName}`, 120, doc.y + 24);
        }

        doc.y += 36;

        // Results display (compact)
        doc
          .fillColor(report.abnormalFlag ? colors.accent : colors.secondary)
          .rect(55, doc.y, 490, 20)
          .fill();

        doc
          .font(fonts.header)
          .fontSize(10)
          .fillColor('#ffffff')
          .text('RESULT', 60, doc.y + 5)
          .fontSize(11)
          .text(`${report.result} ${report.unit || ''}`, 400, doc.y + 5, { width: 100, align: 'right' });

        doc.y += 25;

        // Reference range (compact)
        if (report.normalRange) {
          doc
            .font(fonts.bold)
            .fontSize(7)
            .fillColor(colors.darkGray)
            .text('Normal Range:', 55, doc.y)
            .font(fonts.body)
            .text(report.normalRange, 120, doc.y);
          doc.y += 10;
        }

        // Flag if abnormal (compact)
        if (report.abnormalFlag) {
          doc
            .font(fonts.bold)
            .fontSize(7)
            .fillColor(colors.accent)
            .text(`Flag: ${report.abnormalFlag}`, 55, doc.y);
          doc.y += 10;
        }

        // Notes (compact)
        if (report.notes) {
          doc
            .font(fonts.bold)
            .fontSize(7)
            .fillColor(colors.darkGray)
            .text('Notes:', 55, doc.y)
            .font(fonts.body)
            .text(report.notes, 55, doc.y + 10, { width: 430 });
          doc.y += 20;
        }

        // Add page if less than 1/4 page left
        if (doc.y > 700) doc.addPage();

        // Minimal divider
        if (index < labReports.length - 1) {
          doc
            .strokeColor(colors.mediumGray)
            .lineWidth(0.3)
            .moveTo(50, doc.y + 5)
            .lineTo(550, doc.y + 5)
            .stroke()
            .moveDown(spacing.subsection);
        }
      });
    }

    // ================ FOOTER SECTION ================
    // Add page number and footer text to all pages
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Footer divider
      doc
        .strokeColor(colors.mediumGray)
        .lineWidth(0.3)
        .moveTo(50, 800)
        .lineTo(550, 800)
        .stroke();

      // Confidentiality notice (compact)
      doc
        .fontSize(7)
        .font(fonts.body)
        .fillColor(colors.darkGray)
        .text('CONFIDENTIAL - For authorized medical use only', 50, 805, { width: 500, align: 'center' });

      // Page number (compact)
      doc
        .text(`Page ${i + 1} of ${pages.count} • Generated ${new Date().toLocaleDateString()}`, 50, 815, { width: 500, align: 'center' });
    }

    // Finalize the document
    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};