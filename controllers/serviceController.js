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
            console.warn(`Vehicle with license plate ${licensePlate} not found. Creating a new vehicle owned by admin ${adminId}.`);
            vehicle = new Vehicle({
                make,
                model,
                licensePlate,
                owner: adminId // Assign admin as owner for newly created vehicles via this flow
            });
            await vehicle.save();
        }

        // Determine the user associated with this service.
        // Prefer the vehicle's owner if available. If the vehicle was found but its
        // 'owner' field is missing or null (due to data inconsistencies from previous states),
        // we will fall back to using the adminId for this service record.
        // This ensures the `user` field in Service always receives a valid ObjectId.
        const serviceUser = (vehicle.owner && vehicle.owner.toString()) ? vehicle.owner : adminId;

        // --- 2. Create Service Entry ---
        const newService = new Service({
            vehicleId: vehicle._id, // Link to the found or newly created vehicle
            user: serviceUser,       // Using the determined user ID for the service record
            type, // This field acts as the status (e.g., "Pending", "In Progress")
            description,
            cost,
            date: new Date(), // Service date is now
            customerName,    // Save customerName to Service document
            customerPhone    // Save customerPhone to Service document
        });

        await newService.save();

        res.status(201).json({ msg: 'Service entry added successfully!', service: newService });

    } catch (err) {
        console.error("Error assigning service:", err.message);
        // More specific error handling for Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: `Validation failed: ${messages.join(', ')}` });
        }
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
            // The 'user' field in Service refers to the owner of the vehicle, which is a User ID.
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
