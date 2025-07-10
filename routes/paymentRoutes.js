const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router
  .route('/')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist'),
    paymentController.getAllPayments
  )
  .post(
    authMiddleware.restrictTo('admin', 'receptionist'),
    paymentController.createPayment
  );

router.get(
  '/stats',
  authMiddleware.restrictTo('admin', 'receptionist'),
  paymentController.getPaymentStats
);

router.get(
  '/today',
  authMiddleware.restrictTo('admin', 'receptionist'),
  paymentController.getTodaysPayments
);

router.get('/unpaid', 
  authMiddleware.restrictTo('admin', 'receptionist'),
  paymentController.getUnpaidBills
);
router.patch('/:id/mark-paid',
  authMiddleware.restrictTo('admin', 'receptionist'),
  paymentController.markBillAsPaid
);

router.patch('/:id/status',
  authMiddleware.restrictTo('admin', 'receptionist'),
  paymentController.updatePaymentStatus
);

router
  .route('/:id')
  .get(paymentController.getPayment)
  .patch(
    authMiddleware.restrictTo('admin', 'receptionist'),
    paymentController.updatePayment
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    paymentController.deletePayment
  );

router
  .route('/:id/receipt')
  .get(paymentController.generateReceipt);

router
  .route('/patient/:patientId')
  .get(paymentController.getPaymentsByPatient);

router
  .route('/status/:status')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist'),
    paymentController.getPaymentsByStatus
  );

router
  .route('/billing/:billingId')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist'),
    paymentController.getPaymentsByBilling
  );

router.get('/types', 
 authMiddleware.restrictTo('admin', 'receptionist'),
  paymentController.getPaymentTypes
);

module.exports = router;