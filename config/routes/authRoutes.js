const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimiter = require('../config/rateLimiter');

router.post('/register', authController.register); 
router.post('/login', rateLimiter.authLimiter, authController.login);
router.post('/logout', authController.protect, authController.logout);


router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/me', authController.getMe);
router.patch('/update-me', authController.updateMe);
router.delete('/deactivate-me', authController.deactivateMe);
router.patch('/update-my-password', authController.updateMyPassword);

module.exports = router;