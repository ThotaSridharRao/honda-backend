const Service = require('../models/service');
const Vehicle = require('../models/vehicle'); // Import Vehicle model
const User = require('../models/user'); // Import User model for customer name/phone (if needed)

// @route   POST api/services
// @desc    Assign a new service to a vehicle (admin action) OR allow user to book a service
// @access  Private (requires authentication)
exports.assignService = async (req, res) => {
    // Fields potentially from admin form: make, model, licensePlate, customerName, customerPhone, type, description, cost
    // Fields potentially from user booking form: vehicleId, date, type, description (cost is 0 for user booking initially)
    const { 
        make, model, licensePlate, customerName, customerPhone, // from admin form when creating new vehicle
        vehicleId, date, type, description, cost // from user booking or admin assignment
    } = req.body;

    const userId = req.user.id; // Get user ID from the authenticated token (current logged-in user)

    try {
        let targetVehicle = null;
        let serviceAssigneeUser = userId; // Default assignee for the service is the current user (for user bookings)
        let actualCustomerName = customerName; // Placeholder for customerName
        let actualCustomerPhone = customerPhone; // Placeholder for customerPhone

        // --- Determine the Vehicle and the User for the Service Record ---
        if (vehicleId) {
            // This path is for USER BOOKING: vehicleId is provided, so find the existing vehicle
            // Ensure the vehicle belongs to the authenticated user for security
            targetVehicle = await Vehicle.findOne({ _id: vehicleId, userId: userId });
            if (!targetVehicle) {
                return res.status(404).json({ msg: 'Selected vehicle not found or does not belong to you.' });
            }
            
            // For user booking, get customerName and customerPhone from the authenticated user's profile
            const userProfile = await User.findById(userId);
            if (userProfile) {
                actualCustomerName = userProfile.name;
                actualCustomerPhone = userProfile.email; // Using email as a placeholder for phone if not available in user schema
            } else {
                // Fallback if user profile not found (shouldn't happen with auth)
                actualCustomerName = 'Unknown User';
                actualCustomerPhone = 'N/A';
            }
            // The service is assigned to the user who owns the vehicle
            serviceAssigneeUser = userId; // The service belongs to the logged-in user

        } else {
            // This path is primarily for ADMIN ASSIGNING a new service (possibly for a new/unknown vehicle)
            // Admin must provide licensePlate, make, model, customerName, customerPhone
            if (!licensePlate || !make || !model || !customerName || !customerPhone) {
                return res.status(400).json({ msg: 'Missing required vehicle/customer details for new service assignment (Admin).' });
            }
            
            targetVehicle = await Vehicle.findOne({ licensePlate });

            if (!targetVehicle) {
                console.warn(`Vehicle with license plate ${licensePlate} not found. Creating a new vehicle owned by user ${userId}.`);
                targetVehicle = new Vehicle({
                    make,
                    model,
                    year: req.body.year || 2023, // Admin can provide year, default if not
                    licensePlate,
                    userId: userId // Admin creates this vehicle, so admin's ID is the owner
                });
                await targetVehicle.save();
            }
            // For admin assignment, the service is assigned to the vehicle's owner (which might be the admin, or an existing user)
            serviceAssigneeUser = targetVehicle.userId; // The service belongs to the owner of this vehicle (fetched or newly created)
            actualCustomerName = customerName; // Use customerName from admin form
            actualCustomerPhone = customerPhone; // Use customerPhone from admin form
        }

        // --- Create Service Entry ---
        const newService = new Service({
            vehicleId: targetVehicle._id, // Link to the determined vehicle
            user: serviceAssigneeUser,    // Link to the user (owner of the vehicle)
            date: date || new Date(),     // Use provided date or default to now
            type: type || 'pending',      // Default to 'pending' if not explicitly set (e.g., from admin form)
            description: description,
            cost: cost !== undefined ? cost : 0, // Default cost to 0 for user bookings or use provided for admin
            customerName: actualCustomerName, // Use determined customer name
            customerPhone: actualCustomerPhone // Use determined customer phone
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

// @route   PUT /api/services/:id
// @desc    Update an existing service record
// @access  Private
exports.updateService = async (req, res) => {
  const serviceId = req.params.id;
  // Ensure the user making the request is an admin for this comprehensive update,
  // or that the service belongs to the user if a user is updating their own service.
  // For now, assuming this is an admin-specific update for simplicity.
  if (!req.user.isAdmin) { // Only admin can use this route
      return res.status(403).json({ msg: 'Forbidden: Only administrators can perform this action.' });
  }

  // Admin can update various fields including customer info, parts, and total bill
  const { date, type, description, cost, customerName, customerPhone, partsUsed, totalBill } = req.body; 

  try {
    let service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ msg: 'Service record not found' });
    }

    // Update fields if provided in the request body (only if the field is present in the request)
    if (date !== undefined) service.date = date;
    if (type !== undefined) service.type = type;
    if (description !== undefined) service.description = description;
    if (cost !== undefined) service.cost = cost;
    if (customerName !== undefined) service.customerName = customerName; // Update customerName
    if (customerPhone !== undefined) service.customerPhone = customerPhone; // Update customerPhone
    
    // Handle partsUsed array: replace entirely or merge
    if (partsUsed !== undefined) {
      service.partsUsed = partsUsed;
    }

    // Handle totalBill
    if (totalBill !== undefined) {
      service.totalBill = totalBill;
    }

    await service.save(); // Save the updated service record
    res.json({ msg: 'Service record updated successfully!', service });
  } catch (err) {
    console.error("Error updating service:", err.message);
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({ msg: `Validation failed: ${messages.join(', ')}` });
    }
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'Invalid service ID' });
    }
    res.status(500).send('Server error during updating service.');
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
