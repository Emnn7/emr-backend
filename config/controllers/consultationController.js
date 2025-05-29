const Consultation = require('../models/Consultation');
const AppError = require('../utils/appError');


exports.createConsultation = async (req, res, next) => {
  try {
    console.log('Request body:', req.body); // Add this line
    console.log('User:', req.user); // Add this line
    const { patient, notes, diagnosis, createMedicalHistory } = req.body;
    const doctor = req.user._id;

    const consultation = await Consultation.create({
      patient,
      doctor,
      notes,
      diagnosis
    });

    // Optional medical history creation
    if (createMedicalHistory) {
      await MedicalHistory.create({
        patient,
        doctor,
        diagnosis,
          symptoms ,
        notes,
        createdAt: consultation.createdAt
      });
    }

    res.status(201).json({ status: 'success', data: consultation });
  } catch (err) {
    next(err);
  }
};

exports.getConsultationsByPatient = async (req, res, next) => {
  try {
    console.log("Fetching consultations for patient:", patientId);
console.log("Consultations:", consultations);

    const { patientId } = req.params;

    const consultations = await Consultation.find({ patient: patientId })
      .populate('doctor', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: consultations });
  } catch (err) {
    next(err);
  }
};
