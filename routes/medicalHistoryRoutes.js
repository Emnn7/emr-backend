// medicalHistoryRoutes.js
const express = require('express');
const medicalHistoryController = require('../controllers/medicalHistoryController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/patient/:patientId')
  .get(
    authController.restrictTo('doctor', 'admin'),
    medicalHistoryController.getAllMedicalHistories
  );

router
  .route('/doctor/:doctorId')
  .get(
    authController.restrictTo('doctor'),
    medicalHistoryController.getMedicalHistoriesByDoctor
  );

router
  .route('/')
  .post(
    authController.restrictTo('doctor'),
    medicalHistoryController.createMedicalHistory
  )
  .get(
    authController.restrictTo('doctor', 'admin'),
    medicalHistoryController.getAllMedicalHistoriesByFilter
  );

router
  .route('/:id')
  .get(
    authController.restrictTo('doctor', 'admin'),
    medicalHistoryController.getMedicalHistory
  )
  .patch(
    authController.restrictTo('doctor'),
    medicalHistoryController.updateMedicalHistory
  )
  .delete(
    authController.restrictTo('doctor'),
    medicalHistoryController.deleteMedicalHistory
  );

module.exports = router;