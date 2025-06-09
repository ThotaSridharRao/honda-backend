const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController'); // Adjust path as needed
const authMiddleware = require('../middleware/authMiddleware'); // Adjust path as needed

// All vehicle routes will require authentication
router.use(authMiddleware);

// @route   POST /api/vehicles
// @desc    Add a new vehicle
// @access  Private
router.post('/', vehicleController.addVehicle);

// @route   GET /api/vehicles
// @desc    List all vehicles for the authenticated user
// @access  Private
router.get('/', vehicleController.listVehicles);

// @route   DELETE /api/vehicles/:id
// @desc    Delete a vehicle by ID
// @access  Private
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
