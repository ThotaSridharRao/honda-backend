const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController'); // Adjust path as needed
const authMiddleware = require('../middleware/authMiddleware'); // Adjust path as needed

// All service routes will require authentication
router.use(authMiddleware);

// @route   POST /api/services
// @desc    Assign (create) a new service record
// @access  Private
router.post('/', serviceController.assignService);

// @route   PUT /api/services/:id
// @desc    Update an existing service record
// @access  Private
router.put('/:id', serviceController.updateService); // This line is causing the error if serviceController.updateService is not a function

// @route   GET /api/services
// @desc    Fetch all services for the authenticated user (optional: filter by vehicleId)
// @access  Private
router.get('/', serviceController.fetchServices);

module.exports = router;
