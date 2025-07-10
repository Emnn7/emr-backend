const express = require('express');
const labPaymentController = require('../controllers/labPaymentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Lab payment routes
router.post(
  '/lab-orders/:id/create-billing',
  authMiddleware.restrictTo('doctor', 'admin'),
  labPaymentController.createLabOrderBilling
);

router.get(
  '/lab-orders/:id/payment-status',
  labPaymentController.checkLabOrderPaymentStatus
);

// Add payment processing route if needed
router.post(
  '/lab-orders/:id/process-payment',
  authMiddleware.restrictTo('receptionist'),
  labPaymentController.processLabOrderPayment
);

router.post(
  '/lab-orders/:id/process-payment',
  authMiddleware.protect,
  authMiddleware.restrictTo('receptionist', 'admin'),
  labPaymentController.processLabPayment
);
module.exports = router;