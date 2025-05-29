const express = require('express');
const router = express.Router();
const labTestController = require('../controllers/labTestController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.use(protect); 

router
  .route('/')
  .get(restrictTo('admin', 'doctor', 'lab-assistant'), labTestController.getAllLabTests)
  .post(restrictTo('admin'), labTestController.createLabTest);

router
  .route('/:id')
  .patch(restrictTo('admin', 'doctor'), labTestController.updateLabTest)
  .delete(restrictTo('admin'), labTestController.deleteLabTest);

router.get('/stats', restrictTo('admin'), labTestController.getLabStats);

module.exports = router;
