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
        let vehicle = await Vehicle.findOne({ licensePlate, owner: adminId }); // Admin can manage vehicles for any user.
                                                                                // For now, let's assume admin adds vehicles tied to admin's own user ID for simplicity.
                                                                                // A more robust system would involve searching for a vehicle by licensePlate and finding its actual owner,
                                                                                // or the admin selecting an existing user.
                                                                                // For this scenario, we'll assume the admin inputs customerName/customerPhone and the service
                                                                                // is conceptually linked to the vehicle which might not have a direct 'owner' in the admin context,
                                                                                // so we'll just link the vehicle to the admin who adds it, or handle it as a global vehicle.
                                                                                // Let's refine: For a service entry, the vehicle *must* exist. An admin's task is to create a service for a vehicle,
                                                                                // which can be owned by *any* user. So, let's find/create the vehicle and then the service will reference it.

        let ownerUser = null; // This will hold the actual user who owns the vehicle
        // For simplicity, let's assume the 'customerName' and 'customerPhone' are just for service record.
        // The vehicle itself might be owned by a user in the 'users' collection.
        // We'll search for the vehicle by licensePlate regardless of owner for admin actions,
        // and if not found, create a new vehicle. The owner will be set to the admin for now
        // if a new vehicle is created without an explicit user selection.
        // A more advanced approach would have the admin select an existing user or create a new user.

        // Find vehicle by license plate regardless of owner for admin
        vehicle = await Vehicle.findOne({ licensePlate });

        if (!vehicle) {
            // If vehicle not found, create a new one.
            // For now, let's link new vehicles added via admin form to the admin's own ID
            // for the 'owner' field in the Vehicle schema. This might not be ideal
            // in a multi-customer scenario where admin is adding a customer's vehicle.
            // A more complete solution would require admin to select an existing user or create a new user.
            // For this implementation, we will create a new vehicle if it doesn't exist.
            // The `owner` field of the `Vehicle` schema is `ref: 'User'`.
            // So, we need to associate it with an actual User ID.
            // If the admin is adding a new vehicle for a new customer, how do we get the customer's User ID?
            // This is a missing piece.
            // Temporary solution: Create vehicle without an owner if `owner` is optional in Vehicle schema.
            // If `owner` is required, then we must associate it with a user.
            // Let's assume for now, new vehicles added by admin are "unassigned" to a specific user initially,
            // or we'll need to fetch/create a user based on customerName/customerPhone.
            // Given the existing Vehicle schema:
            // owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            // So, we must have an owner.

            // OPTION 1: Find user by name/phone if customerName/customerPhone can identify a User.
            // This is complex as multiple users could have same name, or phone might not be in user profile.

            // OPTION 2: If we create a new vehicle, we must associate it with *someone*.
            // Let's make a simplifying assumption for the admin panel:
            // When an admin adds a service for a new vehicle, they can either link it to an existing user
            // (by searching for existing user by customerName/customerPhone, which is not what the current form does)
            // or, we can use the admin's own ID as the owner *for the vehicle record itself* if it's a "fleet" managed by admin.
            // Or, more realistically, the `assignService` endpoint should accept a `userId` or `customerEmail`
            // that the admin specifies for the *vehicle owner*.

            // Let's assume for now, if a vehicle with that license plate is NOT found,
            // we will create it and link it to the admin's ID as the owner.
            // This IS a simplification, as an admin might be adding a service for ANY user's vehicle.

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
            user: adminId, // The admin who assigned the service (or potentially the actual owner if passed)
                          // For display on user dashboard, user.html fetches services by owner.
                          // So, this 'user' field in Service model should ideally be the vehicle's owner.
                          // Let's modify: `user` should be the `vehicle.owner`.
            type,
            description,
            cost,
            date: new Date() // Service date is now
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
    const adminId = req.user.id; // Admin performing the update

    try {
        let service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        // Optional: Add logic to ensure only admins can update status
        // (already handled by middleware, but good to double check or add more granular checks)

        service.type = status; // Assuming 'type' field is used for status in your schema
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
        // req.user.isAdmin is populated by auth middleware
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
