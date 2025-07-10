const express = require('express');
const router = express.Router();
const labOrderController = require('../controllers/labOrderController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Get all lab orders
router.get(
  '/',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant', 'receptionist'),
  labOrderController.getAllLabOrders
);

// Create a lab order for a specific patient
router.post(
  '/',
  authMiddleware.restrictTo('admin', 'doctor'),
  labOrderController.createLabOrder
);

// Get lab orders by status
router.get(
  '/status/:status',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant', 'receptionist'),
  labOrderController.getLabOrdersByStatus
);

// Get pending payment lab orders
router.get(
  '/pending-payment',
  authMiddleware.restrictTo('receptionist', 'admin', 'labAssistant'),
  labOrderController.getPendingPaymentOrders
);

router.get(
  '/paid',
  authMiddleware.restrictTo('admin', 'labAssistant'),
  labOrderController.getPaidLabOrders
);

// Update lab order status
router.patch(
  '/:id/status',
  authMiddleware.restrictTo('admin', 'labAssistant'),
  labOrderController.updateLabOrderStatus
);

// CRUD operations on individual lab orders
router
  .route('/:id')
  .get(
    authMiddleware.restrictTo('admin', 'doctor', 'labAssistant', 'receptionist'),
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

// Get lab orders by doctor ID
router.get(
  '/doctor/:doctorId',
  authMiddleware.restrictTo('admin', 'doctor', 'labAssistant'),
  labOrderController.getLabOrdersByDoctor
);

// Get lab orders by patient ID
router.get(
  '/patient/:patientId',
   authMiddleware.restrictTo('admin', 'doctor', 'labAssistant', 'receptionist'),
  labOrderController.getLabOrdersByPatient
);

// Update payment status
router.patch(
  '/:id/payment-status',
  authMiddleware.restrictTo('admin', 'receptionist'),
  labOrderController.updatePaymentStatus
);

router.post(
  '/:id/create-billing',
  authMiddleware.restrictTo('admin', 'receptionist'),
  labOrderController.createLabOrderBilling
);


module.exports = router;
