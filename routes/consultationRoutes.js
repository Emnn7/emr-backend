const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware.protect);

router.route('/new')
  .post(
    authMiddleware.restrictTo('admin', 'doctor'),
    consultationController.createConsultation
  );

router.route('/by-patient/:patientId')
  .get(
    authMiddleware.restrictTo('admin', 'doctor'),
    consultationController.getConsultationsByPatient
  );

module.exports = router;