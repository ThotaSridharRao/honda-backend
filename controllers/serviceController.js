const Service = require('../models/service');
const Vehicle = require('../models/vehicle'); // Import Vehicle model
const User = require('../models/user'); // Import User model for customer name/phone (if needed)

// @route   POST api/services
// @desc    Assign a new service to a vehicle (admin action) OR allow user to book a service
// @access  Private (requires authentication)
exports.assignService = async (req, res) => {
    // Fields potentially from admin form: make, model, licensePlate, customerName, customerPhone
    // Fields potentially from user booking form: vehicleId, date, type, description, cost
    const { 
        make, model, licensePlate, customerName, customerPhone, // from admin form
        vehicleId, date, type, description, cost // from user form (and some overlap with admin)
    } = req.body;

    const userId = req.user.id; // Get user ID from the authenticated token

    try {
        let targetVehicle = null;
        let serviceAssigneeUser = userId; // Default assignee is the current user (for user bookings)

        // --- Determine the Vehicle and the User for the Service Record ---
        if (vehicleId) {
            // This path is for user booking: vehicleId is provided, so find the existing vehicle
            targetVehicle = await Vehicle.findOne({ _id: vehicleId, owner: userId });
            if (!targetVehicle) {
                return res.status(404).json({ msg: 'Selected vehicle not found or does not belong to you.' });
            }
            serviceAssigneeUser = targetVehicle.owner; // Use the actual owner of the vehicle
            // When user books service, customerName and customerPhone are implicitly from the user's profile
            // For now, we'll use the user's name and email. In a real app, you might fetch user details here.
            // Or, keep `customerName` and `customerPhone` from `req.body` only if they come from the admin.
            // For user booking, we'll grab these from the User model if available.
            const userProfile = await User.findById(userId);
            req.body.customerName = userProfile ? userProfile.name : 'Unknown User';
            req.body.customerPhone = userProfile ? userProfile.email : 'No Phone Provided'; // Using email as placeholder for phone if not available
        } else {
            // This path is primarily for admin assigning a new service (possibly for a new/unknown vehicle)
            // Or if licensePlate is provided directly (e.g., admin scanning a new vehicle)
            if (!licensePlate || !make || !model || !customerName || !customerPhone) {
                return res.status(400).json({ msg: 'Missing required vehicle/customer details for new service assignment (Admin).' });
            }
            
            targetVehicle = await Vehicle.findOne({ licensePlate });

            if (!targetVehicle) {
                console.warn(`Vehicle with license plate ${licensePlate} not found. Creating a new vehicle owned by admin ${adminId}.`);
                targetVehicle = new Vehicle({
                    make,
                    model,
                    licensePlate,
                    owner: userId // Assign admin as owner or the relevant user
                });
                await targetVehicle.save();
            }
            serviceAssigneeUser = targetVehicle.owner; // The actual owner of the vehicle
        }

        // --- Create Service Entry ---
        const newService = new Service({
            vehicleId: targetVehicle._id, // Link to the determined vehicle
            user: serviceAssigneeUser,    // Link to the vehicle's owner
            date: date || new Date(),     // Use provided date or default to now
            type: type || 'pending',      // Default to 'pending' if not explicitly set (e.g., from admin form)
            description: description,
            cost: cost !== undefined ? cost : 0, // Default cost to 0 for user bookings
            customerName: req.body.customerName, // Use customerName from req.body (populated for user booking)
            customerPhone: req.body.customerPhone // Use customerPhone from req.body (populated for user booking)
        });

        await newService.save();

        res.status(201).json({ msg: 'Service entry added successfully!', service: newService });

    } catch (err) {
        console.error("Error assigning service:", err.message);
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
// @desc    Get all services for the logged-in user OR all services if admin.
//          Admin can optionally filter out 'picked-up' services via query param.
// @access  Private
exports.fetchServices = async (req, res) => {
    try {
        let services;
        // Get 'includePickedUp' query parameter. Default to false for admin, true for user.
        // If includePickedUp=true, fetch all services, otherwise filter out 'picked-up'
        const includePickedUp = req.query.includePickedUp === 'true';

        if (req.user.isAdmin) {
            let query = {};
            // If includePickedUp is false, filter out 'picked-up' services for admin's current view
            if (!includePickedUp) {
                query.type = { $ne: 'picked-up' }; // $ne means "not equal to"
            }
            services = await Service.find(query)
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
