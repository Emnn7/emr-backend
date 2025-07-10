const mongoose = require('mongoose')
const Diagnostic = require('../models/Diagnostic');
const { uploadFile } = require('../utils/fileUpload'); // Make sure this path is correct
const fs = require('fs');
const path = require('path');


// @desc    Get all diagnostics for a patient
// @route   GET /api/diagnostics/patient/:patientId
// @access  Private
exports.getPatientDiagnostics = async (req, res) => {
  try {
    const diagnostics = await Diagnostic.find({ patient: req.params.patientId })
      .sort('-date')
      .populate('uploadedBy', 'firstName lastName');

    res.json(diagnostics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload diagnostic report
// @route   POST /api/diagnostics
// @access  Private
exports.uploadDiagnostic = async (req, res) => {
  try {
    console.log('Received files:', req.files);
    console.log('Request body:', req.body);

    const { title, description, type, date, facility, notes, patient } = req.body;


    console.log('Patient ID:', patient);
console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(patient));
    // Validate required fields
    if (!title || !type || !date || !facility || !patient) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate patient ID format
    if (!mongoose.Types.ObjectId.isValid(patient)) {
      return res.status(400).json({ message: 'Invalid patient ID format' });
    }

    // Handle file uploads
    const files = req.files.map(file => ({
      url: `/uploads/diagnostics/${file.filename}`,
      type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
      filename: file.filename
    }));

    // Create diagnostic
    const diagnostic = new Diagnostic({
      patient,
      title,
      description,
      type,
      date,
      facility,
      files: files.map(file => ({
        url: file.url,
        type: file.type,
        filename: file.filename,
        thumbnail: file.thumbnail
      })),
      notes,
      uploadedBy: req.user.id
    });

    await diagnostic.save();
    res.status(201).json(diagnostic);
  } catch (err) {
    console.error('Error in uploadDiagnostic:', err);
    res.status(500).json({ 
      message: err.message || 'Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// @desc    Delete diagnostic report
// @route   DELETE /api/diagnostics/:id
// @access  Private
exports.deleteDiagnostic = async (req, res) => {
  try {
    const diagnostic = await Diagnostic.findById(req.params.id);

    if (!diagnostic) {
      return res.status(404).json({ message: 'Diagnostic not found' });
    }

    // Delete associated files
    for (const file of diagnostic.files) {
      if (file.url) {
        const filePath = path.join(__dirname, '..', file.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await diagnostic.remove();

    res.json({ message: 'Diagnostic removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};