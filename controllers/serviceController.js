const Service = require('../models/Service'); // Adjust path as needed
const Vehicle = require('../models/Vehicle'); // Adjust path as needed
const User = require('../models/User'); // Adjust path as needed

// @route   POST /api/services
// @desc    Assign (create) a new service record for a vehicle
// @access  Private (requires authentication)
exports.assignService = async (req, res) => {
  const { vehicleId, date, type, description, cost } = req.body;
  const userId = req.user.id; // Get user ID from the authenticated token

  try {
    // Verify the vehicle exists and belongs to the authenticated user
    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found or does not belong to the user' });
    }

    const newService = new Service({
      userId,
      vehicleId,
      date: date || Date.now(), // Use provided date or default to now
      type,
      description,
      cost
    });

    const service = await newService.save();
    res.status(201).json({ msg: 'Service assigned successfully', service });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during assigning service');
  }
};

// @route   PUT /api/services/:id
// @desc    Update an existing service record
// @access  Private (requires authentication, only owner can update)
exports.updateService = async (req, res) => {
  const serviceId = req.params.id;
  const userId = req.user.id; // Get user ID from the authenticated token
  const { date, type, description, cost } = req.body; // Fields that can be updated

  try {
    let service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ msg: 'Service record not found' });
    }

    // Ensure the service belongs to the authenticated user
    if (service.userId.toString() !== userId) {
      return res.status(401).json({ msg: 'User not authorized to update this service record' });
    }

    // Update fields if provided in the request body
    if (date) service.date = date;
    if (type) service.type = type;
    if (description) service.description = description;
    if (cost !== undefined) service.cost = cost;

    await service.save(); // Save the updated service record
    res.json({ msg: 'Service record updated successfully', service });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Invalid service ID' });
    }
    res.status(500).send('Server error during updating service');
  }
};

// @route   GET /api/services
// @desc    Fetch all services for the authenticated user, optionally by vehicle
// @access  Private (requires authentication)
exports.fetchServices = async (req, res) => {
  const userId = req.user.id; // Get user ID from the authenticated token
  const { vehicleId } = req.query; // Allow filtering by vehicleId from query parameters

  try {
    let query = { userId }; // Always filter by the authenticated user's ID

    if (vehicleId) {
      // Optional: Verify the vehicle belongs to the user if filtering by vehicleId
      const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
      if (!vehicle) {
        return res.status(404).json({ msg: 'Vehicle not found or does not belong to the user' });
      }
      query.vehicleId = vehicleId;
    }

    // Find services based on the query and populate vehicle details
    const services = await Service.find(query)
      .populate('vehicleId', 'make model year licensePlate') // Populate selected fields from the Vehicle model
      .sort({ date: -1 }); // Sort by date descending

    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during fetching services');
  }
};
