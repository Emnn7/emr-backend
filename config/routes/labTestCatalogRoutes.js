const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/labTestCatalogController');

// /api/lab-tests/catalog
router.get('/', catalogController.getAllCatalogTests);
router.post('/', catalogController.createCatalogTest);

module.exports = router;
