const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Get recent patients
router.get('/recent', patientController.getRecentPatients);

// Main route for patients
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

router.route('/search').get(patientController.searchPatients);
// routes/patientRoutes.js

router.get('/medical-reports', authMiddleware.protect, (req, res) => {
  res.status(200).json({ reports: [] });
});

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

// Patient-Doctor Assignment Routes (Admin only)
router.use(authMiddleware.restrictTo('admin'));

router.get('/assignments', patientController.getAllPatientDoctorAssignments);
router.delete('/:patientId/doctor', patientController.unassignDoctorFromPatient);

router
  .route('/:id')
  .get(patientController.getPatient)
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
    authMiddleware.restrictTo('admin', 'labAssistant'),
    patientController.recordVitalSigns
  );

  router.post('/patients/new-vitals', 
    authMiddleware.restrictTo('admin', 'labAssistant'),
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

module.exports = router;
