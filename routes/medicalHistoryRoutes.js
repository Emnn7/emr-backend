const express = require('express');
const medicalHistoryController = require('../controllers/medicalHistoryController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(
    authController.restrictTo('doctor'),
    medicalHistoryController.createMedicalHistory
  );

router
  .route('/:patientId')
  .get(
    authController.restrictTo('doctor', 'admin'),
    medicalHistoryController.getAllMedicalHistories
  );
router.get(
  '/patient/:patientId',
  authController.restrictTo('doctor', 'admin'),
  medicalHistoryController.getAllMedicalHistories
);
router
  .route('/:id')
  .patch(
    authController.restrictTo('doctor'),
    medicalHistoryController.updateMedicalHistory
  )
  .delete(
    authController.restrictTo('doctor'),
    medicalHistoryController.deleteMedicalHistory
  );


 
  router.get(
    '/',
    authController.restrictTo('doctor', 'admin'),
    medicalHistoryController.getAllMedicalHistoriesByFilter
  );
  router.get(
    '/doctor/:doctorId',
    authController.restrictTo('doctor'),
    medicalHistoryController.getMedicalHistoriesByDoctor
  );
  
module.exports = router;




