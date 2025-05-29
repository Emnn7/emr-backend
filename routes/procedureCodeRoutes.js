const express = require('express');
const procedureCodeController = require('../controllers/procedureCodeController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.route('/')
  .get(procedureCodeController.getAllProcedureCodes)
  .post(
    authMiddleware.restrictTo('admin', 'doctor'),
    procedureCodeController.createProcedureCode
  );

router.route('/:id')
  .patch(
    authMiddleware.restrictTo('admin', 'doctor'),
    procedureCodeController.updateProcedureCode
  )
  .delete(
    authMiddleware.restrictTo('admin'),
    procedureCodeController.deleteProcedureCode
  );

module.exports = router;