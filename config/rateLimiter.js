const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (instead of 1 hour)
  max: 20, // Allow 20 attempts (instead of 10)
  message: 'Too many attempts. Please wait 15 minutes.',
  standardHeaders: true,
  skipSuccessfulRequests: true, // Don't count successful logins
});

module.exports = {
  apiLimiter,
  authLimiter
};