const Vehicle = require('../models/vehicle'); // Adjust path as needed
const User = require('../models/user'); // Adjust path as needed for user validation

// @route   POST /api/vehicles
// @desc    Add a new vehicle
// @access  Private (requires authentication)
exports.addVehicle = async (req, res) => {
  const { make, model, year, licensePlate } = req.body;
  const userId = req.user.id; // Get user ID from the authenticated token

  try {
    // Check if the user exists (optional, but good for data integrity)
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Check if a vehicle with the same license plate already exists for this user (or globally if license plates are truly unique)
    let existingVehicle = await Vehicle.findOne({ licensePlate, userId });
    if (existingVehicle) {
      return res.status(400).json({ msg: 'Vehicle with this license plate already exists for this user.' });
    }

    const newVehicle = new Vehicle({
      userId,
      make,
      model,
      year,
      licensePlate
    });

    const vehicle = await newVehicle.save();
    res.status(201).json({ msg: 'Vehicle added successfully', vehicle });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during adding vehicle');
  }
};

// @route   GET /api/vehicles
// @desc    List all vehicles for the authenticated user
// @access  Private (requires authentication)
exports.listVehicles = async (req, res) => {
  const userId = req.user.id; // Get user ID from the authenticated token

  try {
    // Find all vehicles belonging to the authenticated user
    const vehicles = await Vehicle.find({ userId }).sort({ year: -1 }); // Sort by year descending
    res.json(vehicles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during listing vehicles');
  }
};

// @route   DELETE /api/vehicles/:id
// @desc    Delete a vehicle by ID
// @access  Private (requires authentication, only owner can delete)
exports.deleteVehicle = async (req, res) => {
  const vehicleId = req.params.id;
  const userId = req.user.id; // Get user ID from the authenticated token

  try {
    let vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }

    // Check if the authenticated user is the owner of the vehicle
    if (vehicle.userId.toString() !== userId) {
      return res.status(401).json({ msg: 'User not authorized to delete this vehicle' });
    }

    await Vehicle.deleteOne({ _id: vehicleId }); // Use deleteOne with query
    res.json({ msg: 'Vehicle removed successfully' });
  } catch (err) {
    console.error(err.message);
    // Check for invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Invalid vehicle ID' });
    }
    res.status(500).send('Server error during deleting vehicle');
  }
};
