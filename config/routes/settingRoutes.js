const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.route('/')
  .get(protect, restrictTo('admin'), settingsController.getSettings)
  .put(protect, restrictTo('admin'), settingsController.updateSettings);

router.route('/:section')
  .get(protect, restrictTo('admin'), settingsController.getSettingsSection);


module.exports = router;