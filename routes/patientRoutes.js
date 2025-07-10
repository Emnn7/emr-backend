const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Public for authenticated users
router.get('/recent', patientController.getRecentPatients);

router
  .route('/')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist', 'doctor'),
    patientController.getAllPatients
  )
  .post(
    authMiddleware.restrictTo('admin', 'receptionist'),
    patientController.createPatient
  );

router
  .route('/search')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist', 'doctor', 'labAssistant'),
    patientController.searchPatients
  );

router.get(
  '/:id/for-vitals',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
  patientController.getPatientForVitals
);

router.get(
  '/unassigned',
  authMiddleware.restrictTo('admin'),
  patientController.getUnassignedPatients
);

router.post(
  '/assign-doctor',
  authMiddleware.restrictTo('admin'),
  patientController.assignDoctorToPatient
);

router.get(
  '/by-doctor/:doctorId',
  authMiddleware.restrictTo('admin', 'doctor'),
  patientController.getPatientsByDoctor
);

router.get('/assignments', patientController.getAllPatientDoctorAssignments);
router.delete('/:patientId/doctor', patientController.unassignDoctorFromPatient);

 router.get(
  '/vital-signs',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
  patientController.getAllVitalSigns
);

router.patch(
  '/:id/payment-status',
  authMiddleware.restrictTo('admin', 'receptionist'),
  patientController.updatePaymentStatus
);

router
  .route('/:id')
  .get(patientController.getPatient)

router
  .route('/:id')
  .patch(
    authMiddleware.restrictTo('admin', 'receptionist'),
    patientController.updatePatient
  )
  .delete(authMiddleware.restrictTo('admin'), patientController.deletePatient);

router
  .route('/:id/medical-history')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist', 'doctor'),
    patientController.getPatientMedicalHistory
  );

router
  .route('/:id/medical-reports')
  .get(
    authMiddleware.restrictTo('admin', 'doctor'),
    patientController.getMedicalReportsList
  );

router.get('/verify',
  authMiddleware.restrictTo('receptionist'),
  patientController.verifyPatient
);

router
  .route('/:id/vital-signs')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    patientController.getPatientVitalSigns
  )
  .post(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    patientController.recordVitalSigns
  );

router.post('/new-prescription',
  authMiddleware.restrictTo('admin', 'doctor'),
  patientController.createPrescription
);

router.post('/new-billing',
  authMiddleware.restrictTo('admin', 'receptionist'),
  patientController.createBilling
);

router.route('/:id/prescriptions')
  .get(
    authMiddleware.restrictTo('admin', 'doctor'),
    patientController.getPatientPrescriptions
  );

router.route('/:id/lab-orders')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    patientController.getPatientLabOrders
  );
 

// ✅ Move this to the bottom — only admin can access the next few routes
router.use(authMiddleware.restrictTo('admin'));



module.exports = router;
