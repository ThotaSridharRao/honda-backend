const express = require('express');
const serviceController = require('../controllers/serviceController'); // Adjust path as needed
const authMiddleware = require('../middleware/authMiddleware'); // Adjust path as needed

// This module now exports a function that takes 'io' as an argument.
// This allows the server.js to pass the io instance to these routes.
module.exports = (io) => {
    const router = express.Router();

    // All service routes will require authentication
    router.use(authMiddleware);

    // Pass the 'io' instance to the serviceController functions that need to emit events
    // We'll modify serviceController.js next to accept 'io' as a parameter in these specific functions.

    // @route   POST /api/services
    // @desc    Assign (create) a new service record
    // @access  Private (Admin only)
    // Wrap controller functions to pass 'req', 'res', and 'io'
    router.post('/', (req, res) => serviceController.assignService(req, res, io));

    // @route   PUT /api/services/:id
    // @desc    Update an existing service record (full details)
    // @access  Private (Admin only)
    // Wrap controller functions to pass 'req', 'res', and 'io'
    router.put('/:id', (req, res) => serviceController.updateService(req, res, io)); 

    // @route   PATCH /api/services/:id/status
    // @desc    Update service status (admin action)
    // @access  Private (Admin only)
    // Wrap controller functions to pass 'req', 'res', and 'io'
    router.patch('/:id/status', (req, res) => serviceController.updateServiceStatus(req, res, io));

    // @route   GET /api/services
    // @desc    Fetch all services for the authenticated user (optional: filter by vehicleId)
    // @access  Private
    // This route does not need to emit Socket.IO events, so 'io' is not passed.
    router.get('/', serviceController.fetchServices);

    return router;
};
