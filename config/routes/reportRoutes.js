const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, reportController.generateReport);
router.get('/history', protect, reportController.getReportHistory);

module.exports = router;