const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');


// Protect all routes after this middleware
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/test', (req, res) => {
  res.status(200).json({ message: 'Admin route working!' });
});
// Role and Permission Management
router.get('/roles', adminController.getRoles);
router.get('/permissions', adminController.getPermissions);
router.patch('/users/:role/:id/permissions', adminController.updateUserPermissions);
// User management routes
router.route('/users/:role').get(adminController.getAllUsers);
router.route('/users').post(adminController.createUser);
router
  .route('/users/:role/:id')
  .get(adminController.getUser)
  .patch(adminController.updateUser)
  .delete(adminController.deleteUser);

// Patient management routes
router.route('/patients').get(adminController.getAllPatients);
router
  .route('/patients/:id')
  .get(adminController.getPatient)
  .patch(adminController.updatePatient)
  .delete(adminController.deletePatient);
  

router
  .route('/settings')
  .get(adminController.getSystemSettings)
  .patch(adminController.updateSystemSettings);


// System stats and audit logs
router.route('/stats').get(adminController.getSystemStats);
router.route('/auditLogs').get(adminController.getAuditLogs);

module.exports = router;





