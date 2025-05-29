const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware.protect);

// Doctor routes
router.get('/me', doctorController.getMyProfile);
router.patch('/update-me', doctorController.updateMyProfile);
router.get('/my-patients', doctorController.getMyPatients);
router.get('/my-appointments', doctorController.getMyAppointments);
router.get('/my-prescriptions', doctorController.getMyPrescriptions);
router.get('/my-lab-orders', doctorController.getMyLabOrders);
router.get('/patient-history/:patientId', doctorController.getPatientHistory);

// Doctor-specific patient access
router.get(
  '/patients/:patientId',
  authMiddleware.restrictTo('doctor'),
  doctorController.getPatientInfo
);

router.get(
  '/patients/:patientId/medical-history',
  authMiddleware.restrictTo('doctor'),
  doctorController.getPatientMedicalHistory
);

// Admin-only routes
router.get(
  '/',
  authMiddleware.restrictTo('admin', 'receptionist'),
  doctorController.getAllDoctors
);

router
  .route('/:id')
  .get(authMiddleware.restrictTo('admin'), doctorController.getDoctor)
  .patch(authMiddleware.restrictTo('admin'), doctorController.updateDoctor)
  .delete(authMiddleware.restrictTo('admin'), doctorController.deactivateDoctor);

router.get(
  '/:id/schedule',
  authMiddleware.restrictTo('admin'),
  doctorController.getDoctorSchedule
);

router.get(
  '/:id/assigned-patients',
  authMiddleware.restrictTo('admin', 'doctor'),
  doctorController.getAssignedPatients
);

module.exports = router;