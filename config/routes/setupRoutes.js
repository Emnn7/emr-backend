const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { ROLES } = require('../config/roles');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/appError');
const router = express.Router();

// GET /api/v1/setup → Check if setup is available
router.get('/', async (req, res, next) => {
  try {
    const adminCount = await Admin.countDocuments();
    res.status(200).json({ 
      status: 'success',
      data: { 
        setupAvailable: adminCount === 0 
      }
    });
  } catch (error) {
    next(new AppError('Error checking setup availability', 500));
  }
});

// POST /api/v1/setup → Register initial admin
router.post('/', async (req, res, next) => {
  try {
    // 1) Check if setup is already completed
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return next(new AppError('Initial setup has already been completed', 403));
    }

    // 2) Get and validate input
    const { firstName, lastName, email, phone, password, passwordConfirm } = req.body;

    // Required fields check
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'passwordConfirm'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
    }

    // Password confirmation check
    if (password !== passwordConfirm) {
      return next(new AppError('Passwords do not match', 400));
    }

    // Email format validation (simple check)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    // 3) Check if email already exists
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    // 4) Hash password
    if (req.body.password !== req.body.passwordConfirm) {
      return next(new AppError('Passwords do not match', 400));}

    // 5) Create admin (force role to ADMIN)
    
    const newAdmin = await Admin.create({
      firstName,
      lastName,
      email,
      phone,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      role: ROLES.ADMIN, // Force role to ADMIN for setup
      active: true
    });

    // 6) Create audit log
    await AuditLog.create({
      action: 'create',
      entity: 'admin',
      entityId: newAdmin._id,
      user: newAdmin._id,
      userModel: 'Admin',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: 'Initial admin setup'
    });

    // 7) Send response
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: newAdmin._id,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          email: newAdmin.email,
          role: newAdmin.role
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;