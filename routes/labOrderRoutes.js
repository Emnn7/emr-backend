const express = require('express');
const router = express.Router();
const labOrderController = require('../controllers/labOrderController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Routes for all lab orders
router
  .route('/')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    labOrderController.getAllLabOrders
  )
 router.route('/doctor/patients/:patientId/new')
  .post(
    authMiddleware.restrictTo('admin', 'doctor'),
    labOrderController.createLabOrder
  );
  // Route to get lab orders by status with optional limit
router.get(
  '/status/:status',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
  labOrderController.getLabOrdersByStatus
);

// Route to update lab order status
router.patch(
  '/:id/status',
  authMiddleware.restrictTo('admin', 'labAssistant'),
  labOrderController.updateLabOrderStatus
);
  

// Route for a single lab order by ID
router
  .route('/:id')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
    labOrderController.getLabOrder
  )
  .patch(
    authMiddleware.restrictTo('admin', 'doctor'),
    labOrderController.updateLabOrder
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    labOrderController.deleteLabOrder
  );

// Route to get lab orders by doctor ID
router.get(
  '/doctor/:doctorId',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
  labOrderController.getLabOrdersByDoctor
);

// Route to get lab orders by patient ID
router.get(
  '/patient/:patientId',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
  labOrderController.getLabOrdersByPatient
);

// Route to get lab orders by status
router.get(
  '/status/:status',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
  labOrderController.getLabOrdersByStatus
);

module.exports = router;
