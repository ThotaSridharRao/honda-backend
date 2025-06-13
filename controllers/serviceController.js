const Service = require('../models/service');
const Vehicle = require('../models/vehicle'); // Import Vehicle model
const User = require('../models/user'); // Import User model for customer name/phone (if needed)

// @route   POST api/services
// @desc    Assign a new service to a vehicle (admin action) OR allow user to book a service
// @access  Private (requires authentication)
exports.assignService = async (req, res) => {
    // Fields potentially from admin form: make, model, licensePlate, customerName, customerPhone, type, description, cost, partsUsed, totalBill
    // Fields potentially from user booking form: vehicleId, date, type, description, cost (0 for user)
    const { 
        make, model, licensePlate, customerName, customerPhone, // from admin form when creating new vehicle
        vehicleId, date, type, description, cost, partsUsed, totalBill // from user booking or admin assignment
    } = req.body;

    const userId = req.user.id; // Get user ID from the authenticated token

    try {
        let targetVehicle = null;
        let serviceAssigneeUser = userId; // Default assignee is the current user (for user bookings)

        // --- Determine the Vehicle and the User for the Service Record ---
        if (vehicleId) {
            // This path is for user booking: vehicleId is provided, so find the existing vehicle
            targetVehicle = await Vehicle.findOne({ _id: vehicleId, userId: userId });
            if (!targetVehicle) {
                return res.status(404).json({ msg: 'Selected vehicle not found or does not belong to you.' });
            }
            serviceAssigneeUser = targetVehicle.userId; 
            
            // For user bookings, customerName and customerPhone are implicitly from the user's profile
            const userProfile = await User.findById(userId);
            req.body.customerName = userProfile ? userProfile.name : 'Unknown User';
            req.body.customerPhone = userProfile ? userProfile.email : 'No Phone Provided'; 
        } else {
            // This path is primarily for admin assigning a new service (possibly for a new/unknown vehicle)
            if (!licensePlate || !make || !model || !customerName || !customerPhone) {
                return res.status(400).json({ msg: 'Missing required vehicle/customer details for new service assignment (Admin).' });
            }
            
            targetVehicle = await Vehicle.findOne({ licensePlate });

            if (!targetVehicle) {
                console.warn(`Vehicle with license plate ${licensePlate} not found. Creating a new vehicle owned by user ${userId}.`);
                targetVehicle = new Vehicle({
                    make,
                    model,
                    licensePlate,
                    userId: userId 
                });
                await targetVehicle.save();
            }
            serviceAssigneeUser = targetVehicle.userId; 
        }

        // --- Create Service Entry ---
        const newService = new Service({
            vehicleId: targetVehicle._id,
            user: serviceAssigneeUser,
            date: date || new Date(),
            type: type || 'pending',
            description: description,
            cost: cost !== undefined ? cost : 0, // This is now 'estimated cost' for initial admin entry or user booking
            customerName: req.body.customerName,
            customerPhone: req.body.customerPhone,
            partsUsed: partsUsed || [], // Initialize with provided parts or empty array
            totalBill: totalBill !== undefined ? totalBill : 0 // Initialize with provided total or 0
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
    // No other fields like cost, partsUsed, totalBill can be updated through this endpoint.
    // For that, we will create a dedicated update service endpoint if needed, or expand this one.

    try {
        let service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        service.type = status; 
        await service.save();

        res.json({ msg: 'Service status updated successfully!', service });
    } catch (err) {
        console.error("Error updating service status:", err.message);
        res.status(500).send('Server Error while updating service status.');
    }
};

// @route   PUT /api/services/:id
// @desc    Update an existing service record (comprehensive update, for admin)
// @access  Private (Admin only) - This endpoint will be primarily used by admin to update details like cost, parts, total bill
exports.updateService = async (req, res) => {
    const serviceId = req.params.id;
    const { date, type, description, cost, partsUsed, totalBill, customerName, customerPhone } = req.body;

    try {
        let service = await Service.findById(serviceId);

        if (!service) {
            return res.status(404).json({ msg: 'Service record not found' });
        }

        // Apply updates if provided. Admins can update various fields.
        // For security/roles, you might add checks here (e.g., only admin can set totalBill/partsUsed)
        if (date) service.date = date;
        if (type) service.type = type;
        if (description !== undefined) service.description = description; // Allow empty string
        if (cost !== undefined) service.cost = cost;
        if (partsUsed !== undefined) service.partsUsed = partsUsed; // Update parts array
        if (totalBill !== undefined) service.totalBill = totalBill; // Update total bill
        if (customerName !== undefined) service.customerName = customerName;
        if (customerPhone !== undefined) service.customerPhone = customerPhone;


        await service.save();
        res.json({ msg: 'Service record updated successfully', service });

    } catch (err) {
        console.error("Error updating service:", err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: `Validation failed: ${messages.join(', ')}` });
        }
        res.status(500).send('Server error during updating service.');
    }
};


// @route   GET /api/services
// @desc    Get all services for the logged-in user OR all services if admin.
//          Admin can optionally filter out 'picked-up' services via query param.
// @access  Private
exports.fetchServices = async (req, res) => {
    try {
        let services;
        const includePickedUp = req.query.includePickedUp === 'true';

        if (req.user.isAdmin) {
            let query = {};
            if (!includePickedUp) {
                query.type = { $ne: 'picked-up' };
            }
            services = await Service.find(query)
                .populate('vehicleId')
                .populate('user');
        } else {
            services = await Service.find({ user: req.user.id })
                .populate('vehicleId');
        }

        services = services.filter(service => service.vehicleId !== null);

        res.json(services);
    } catch (err) {
        console.error("Error fetching services:", err.message);
        res.status(500).send('Server Error while fetching services.');
    }
};
