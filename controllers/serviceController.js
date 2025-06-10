const Service = require('../models/service');
const Vehicle = require('../models/vehicle'); // Import Vehicle model
const User = require('../models/user'); // Import User model for customer name/phone (if needed)

// @route   POST api/services
// @desc    Assign a new service to a vehicle (admin action)
// @access  Private (Admin only)
exports.assignService = async (req, res) => {
    // Expected fields from admin form: make, model, licensePlate, customerName, customerPhone, type, description, cost
    const { make, model, licensePlate, customerName, customerPhone, type, description, cost } = req.body;
    const adminId = req.user.id; // Get the ID of the admin assigning the service

    try {
        // --- 1. Find or Create Vehicle ---
        let vehicle = await Vehicle.findOne({ licensePlate });

        if (!vehicle) {
            // If vehicle not found, create a new one.
            // For simplicity, we're assuming any new vehicle added via admin form
            // is owned by the admin in the 'Vehicle' schema.
            // A more robust system would involve the admin selecting an existing user
            // or creating a new user to associate with the vehicle.
            console.warn(`Vehicle with license plate ${licensePlate} not found. Creating a new vehicle owned by admin ${adminId}.`);
            vehicle = new Vehicle({
                make,
                model,
                licensePlate,
                owner: adminId // Assign admin as owner for newly created vehicles via this flow
            });
            await vehicle.save();
        }

        // --- 2. Create Service Entry ---
        const newService = new Service({
            vehicleId: vehicle._id, // Link to the found or newly created vehicle
            user: vehicle.owner, // The actual owner of the vehicle (from Vehicle schema)
                                 // This links the service to the end user for their dashboard
            type, // This field acts as the status (e.g., "Pending", "In Progress")
            description,
            cost,
            date: new Date(), // Service date is now
            customerName,    // <--- ADDED: Save customerName
            customerPhone    // <--- ADDED: Save customerPhone
        });

        await newService.save();

        res.status(201).json({ msg: 'Service entry added successfully!', service: newService });

    } catch (err) {
        console.error("Error assigning service:", err.message);
        res.status(500).send('Server Error while assigning service.');
    }
};

// @route   PATCH api/services/:id/status
// @desc    Update service status (admin action)
// @access  Private (Admin only)
exports.updateServiceStatus = async (req, res) => {
    const { id } = req.params; // Service ID
    const { status } = req.body; // New status
    // const adminId = req.user.id; // Admin performing the update (auth middleware ensures admin access)

    try {
        let service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        // Update the 'type' field which we are using for status
        service.type = status; 
        await service.save();

        res.json({ msg: 'Service status updated successfully!', service });
    } catch (err) {
        console.error("Error updating service status:", err.message);
        res.status(500).send('Server Error while updating service status.');
    }
};


// @route   GET api/services
// @desc    Get all services for the logged-in user OR all services if admin
// @access  Private
exports.fetchServices = async (req, res) => {
    try {
        let services;
        // Check if the requesting user is an admin
        // req.user.isAdmin is populated by auth middleware (which ensures admin access)
        if (req.user.isAdmin) {
            // If admin, fetch all services, and populate both vehicle and user details
            services = await Service.find()
                .populate('vehicleId') // Populate vehicle details
                .populate('user'); // Populate user (owner) details
        } else {
            // If regular user, fetch only their services
            services = await Service.find({ user: req.user.id })
                .populate('vehicleId'); // Populate vehicle details for their services
        }

        // Filter out services that might not have a populated vehicleId (e.g., if vehicle was deleted)
        services = services.filter(service => service.vehicleId !== null);

        res.json(services);
    } catch (err) {
        console.error("Error fetching services:", err.message);
        res.status(500).send('Server Error while fetching services.');
    }
};
