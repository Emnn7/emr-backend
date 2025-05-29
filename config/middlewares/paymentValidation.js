const { body } = require('express-validator');

exports.validatePayment = [
  body('patientId').isMongoId().withMessage('Invalid patient ID'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('services.*.code').notEmpty().withMessage('Service code is required'),
  body('services.*.amount').isFloat({ gt: 0 }).withMessage('Service amount must be greater than 0'),
  body('paymentMethod').isIn(['cash', 'card', 'insurance', 'bank-transfer', 'mobile-money']),
  body('discount').optional().isFloat({ min: 0 }),
  body('taxAmount').optional().isFloat({ min: 0 })
];