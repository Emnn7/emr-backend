const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router
  .route('/')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist'),
    billingController.getAllBillings
  )
  .post(
    authMiddleware.restrictTo('admin', 'receptionist'),
    billingController.createBilling
  );

  router.get('/unpaid', 
  authMiddleware.restrictTo('admin', 'receptionist'),
  billingController.getUnpaidBills
);

router.patch('/:id/status',
  authMiddleware.restrictTo('admin', 'receptionist'),
  billingController.updateBillingStatus
);

router
  .route('/:id')
  .get(billingController.getBilling)
  .patch(
    authMiddleware.restrictTo('admin', 'receptionist'),
    billingController.updateBilling
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    billingController.deleteBilling
  );

router
  .route('/:id/invoice')
  .get(billingController.generateInvoice);

router
  .route('/patient/:patientId')
  .get(billingController.getBillingsByPatient);

router
  .route('/status/:status')
  .get(
    authMiddleware.restrictTo('admin', 'receptionist'),
    billingController.getBillingsByStatus
  );

router.post(
  '/patient/:patientId/registration',
  authMiddleware.restrictTo('admin', 'receptionist'),
  billingController.createRegistrationBilling
);

module.exports = router;