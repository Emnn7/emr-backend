const express = require('express');
const vitalSignsController = require('../controllers/vitalSignsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(
    authController.restrictTo('labAssistant', 'doctor'),
    vitalSignsController.createVitalSigns
  );

  router
  .route('/')
  .get(
    authController.restrictTo('labAssistant', 'doctor'),
    vitalSignsController.getAllVitalSignsWithoutPatient
  )
  .post(
    authController.restrictTo('labAssistant', 'doctor'),
    vitalSignsController.createVitalSigns
  );

router
  .route('/:patientId')
  .get(
    authController.restrictTo('doctor', 'labAssistant'),
    vitalSignsController.getAllVitalSigns
  );

router
  .route('/:id')
  .get(vitalSignsController.getVitalSigns)
  .patch(
    authController.restrictTo('labAssistant', 'doctor'),
    vitalSignsController.updateVitalSigns
  )
  .delete(
    authController.restrictTo('labAssistant', 'doctor'),
    vitalSignsController.deleteVitalSigns
  );

module.exports = router;