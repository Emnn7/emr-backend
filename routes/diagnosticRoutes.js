const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const diagnosticController = require('../controllers/diagnosticController');
const { uploadHandler } = require('../utils/fileUpload'); // Import uploadHandler

// Add route logging for debugging
router.use((req, res, next) => {
  console.log(`Diagnostic route accessed: ${req.method} ${req.path}`);
  next();
});

router.route('/patient/:patientId')
  .get(protect, diagnosticController.getPatientDiagnostics);

router.route('/')
  .post(
    protect, 
    uploadHandler, // Use the uploadHandler middleware
    diagnosticController.uploadDiagnostic
  );

router.route('/:id')
  .delete(protect, diagnosticController.deleteDiagnostic);

module.exports = router;