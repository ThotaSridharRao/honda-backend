const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController'); // Adjust path as needed
const authMiddleware = require('../middleware/authMiddleware'); // Adjust path as needed

// All service routes will require authentication
router.use(authMiddleware);

// @route   POST /api/services
// @desc    Assign (create) a new service record
// @access  Private (Admin only)
router.post('/', serviceController.assignService);

// @route   PUT /api/services/:id
// @desc    Update an existing service record (full details)
// @access  Private (Admin only)
router.put('/:id', serviceController.updateService); // Re-added: This route handles the full update from admin dashboard

// @route   PATCH /api/services/:id/status
// @desc    Update service status (admin action)
// @access  Private (Admin only)
// Corrected to use PATCH method and reference the correct controller function
router.patch('/:id/status', serviceController.updateServiceStatus);

// @route   GET /api/services
// @desc    Fetch all services for the authenticated user (optional: filter by vehicleId)
// @access  Private
router.get('/', serviceController.fetchServices);

module.exports = router;
