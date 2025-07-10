const express = require('express');
const router = express.Router();
const patientProcedureController = require('../controllers/patientProcedureController');
const authcontroller = require('../controllers/authcontroller');

router.use(authcontroller.protect);

router.post('/',
  authcontroller.restrictTo('doctor'),
  patientProcedureController.createPatientProcedure
);


router.get('/', 
  authcontroller.restrictTo('doctor', 'receptionist'),
  patientProcedureController.getPatientProcedures
);

// Add this new route
router.get('/:id',
  authcontroller.restrictTo('doctor', 'receptionist'),
  patientProcedureController.getPatientProcedure
);

router.patch('/:id/status', 
  authcontroller.restrictTo('receptionist'),
  patientProcedureController.updateProcedureStatus
);

router.patch(
  '/:id/payment-status',
  authcontroller.restrictTo('admin', 'receptionist'),
  patientProcedureController.updatePaymentStatus
);

module.exports = router;