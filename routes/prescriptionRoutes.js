const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router
  .route('/')
  .get(
    authMiddleware.restrictTo('admin', 'doctor'),
    prescriptionController.getAllPrescriptions
  )
  router.route('/')
  .post(
    authMiddleware.restrictTo('admin', 'doctor'),
    prescriptionController.createPrescription
  );

router
  .route('/doctor/:doctorId')
  .get(
    authMiddleware.restrictTo('admin', 'doctor'),
    prescriptionController.getPrescriptionsByDoctor
  );

router
  .route('/:id')
  .get(prescriptionController.getPrescription)
  .patch(
    authMiddleware.restrictTo('admin', 'doctor'),
    prescriptionController.updatePrescription
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    prescriptionController.deletePrescription
  );

router
  .route('/:id/pdf')
  .get(prescriptionController.generatePrescriptionPDF);

router
  .route('/patient/:patientId')
  .get(prescriptionController.getPrescriptionsByPatient);

router
  .route('/status/:status')
  .get(
    authMiddleware.restrictTo('admin', 'doctor'),
    prescriptionController.getPrescriptionsByStatus
  );



module.exports = router;