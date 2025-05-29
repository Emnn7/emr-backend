const express = require('express');
const router = express.Router();
const labReportController = require('../controllers/labReportController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router
  .route('/')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    labReportController.getAllLabReports
  )
  .post(
    authMiddleware.restrictTo('admin', 'labAssistant'),
    labReportController.createLabReport
  );

router
  .route('/:id')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    labReportController.getLabReport
  )
  .patch(
    authMiddleware.restrictTo('admin', 'labAssistant'),
    labReportController.updateLabReport
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    labReportController.deleteLabReport
  );

router
  .route('/:id/verify')
  .patch(
    authMiddleware.restrictTo('admin', 'doctor'),
    labReportController.verifyLabReport
  );

router
  .route('/:id/pdf')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    labReportController.generateLabReportPDF
  );

router
  .route('/patient/:patientId')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    labReportController.getLabReportsByPatient
  );

router
  .route('/status/:status')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    labReportController.getLabReportsByStatus
  );

module.exports = router;