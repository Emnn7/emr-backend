const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router
  .route('/')
  .get(appointmentController.getAllAppointments)
  .post(
    authMiddleware.restrictTo('admin', 'receptionist'),
    appointmentController.createAppointment
  );
  router.get('/today', appointmentController.getTodayAppointments);


  router
  .route('/date-range')
  .get(appointmentController.getAppointmentsByDateRange);

router
  .route('/available-slots')
  .get(appointmentController.getAvailableTimeSlots);

router
  .route('/:id')
  .get(appointmentController.getAppointment)
  .patch(
    authMiddleware.restrictTo('admin', 'receptionist', 'doctor'),
    appointmentController.updateAppointment
  )
  .delete(
    authMiddleware.restrictTo('admin', 'receptionist'),
    appointmentController.deleteAppointment
  );

  router.get('/patient/:patientId', appointmentController.getAppointmentsByPatient);
router.get('/doctor/:doctorId', appointmentController.getAppointmentsByDoctor);


module.exports = router;