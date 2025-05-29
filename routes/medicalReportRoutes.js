const express = require('express');
const router = express.Router();
const medicalReportController = require('../controllers/medicalReportController');
const { protect, restrictTo, checkPermissions } = require('../middlewares/authMiddleware');

router.use(protect);

// GET all medical reports - Admin only (needs readAll permission)
router.get(
  '/',
  restrictTo('admin', 'doctor', 'labAssistant'),
  checkPermissions('medicalReports', 'readAll'),
  medicalReportController.getAllMedicalReports
);

// Add to medicalReportRoutes.js
router.get(
  '/:id/download',
  restrictTo('admin', 'doctor'),
  checkPermissions('medicalReports', 'read'),
  medicalReportController.downloadMedicalReport
);
router.get(
  '/:id/file',
  restrictTo('admin', 'doctor'),
  checkPermissions('medicalReports', 'read'),
  medicalReportController.getMedicalReportFile
);

// Generate new medical report - Admin, Doctor
router.post(
  '/generate',
  restrictTo('admin', 'doctor'),
  checkPermissions('medicalReports', 'generate'),
  medicalReportController.generateMedicalReport
);

// Get single report - Admin, Doctor
router.get(
  '/:id',
  restrictTo('admin', 'doctor'),
  checkPermissions('medicalReports', 'read'),
  medicalReportController.getMedicalReport
);

// Delete report - Admin only
router.delete(
  '/:id',
  restrictTo('admin'),
  checkPermissions('medicalReports', 'delete'),
  medicalReportController.deleteMedicalReport
);

module.exports = router;