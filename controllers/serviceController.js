const Service = require('../models/service');
const Vehicle = require('../models/vehicle');
const User = require('../models/user');
const { io } = require('../server'); // Import the io instance from server.js

// @route   POST api/services
// @desc    Assign a new service to a vehicle (admin action) OR allow user to book a service
// @access  Private (requires authentication)
exports.assignService = async (req, res) => {
    const { 
        make, model, licensePlate, customerName, customerPhone,
        vehicleId, date, type, description, cost, partsUsed, totalBill
    } = req.body;

    const userId = req.user.id;

    try {
        let targetVehicle = null;
        let serviceAssigneeUser = userId;
        let actualCustomerName = customerName;
        let actualCustomerPhone = customerPhone;

        if (vehicleId) {
            targetVehicle = await Vehicle.findOne({ _id: vehicleId, userId: userId });
            if (!targetVehicle) {
                return res.status(404).json({ msg: 'Selected vehicle not found or does not belong to you.' });
            }
            
            const userProfile = await User.findById(userId);
            if (userProfile) {
                actualCustomerName = userProfile.name;
                actualCustomerPhone = userProfile.email; // Using email as placeholder
            } else {
                actualCustomerName = 'Unknown User';
                actualCustomerPhone = 'N/A';
            }
            serviceAssigneeUser = userId;

        } else {
            if (!licensePlate || !make || !model || !customerName || !customerPhone) {
                return res.status(400).json({ msg: 'Missing required vehicle/customer details for new service assignment (Admin).' });
            }
            
            targetVehicle = await Vehicle.findOne({ licensePlate });

            if (!targetVehicle) {
                console.warn(`Vehicle with license plate ${licensePlate} not found. Creating a new vehicle owned by user ${userId}.`);
                targetVehicle = new Vehicle({
                    make,
                    model,
                    year: req.body.year || 2023,
                    licensePlate,
                    userId: userId
                });
                await targetVehicle.save();
            }
            serviceAssigneeUser = targetVehicle.userId;
            actualCustomerName = customerName;
            actualCustomerPhone = customerPhone;
        }

        const newService = new Service({
            vehicleId: targetVehicle._id,
            user: serviceAssigneeUser,
            date: date || new Date(),
            type: type || 'pending',
            description: description,
            cost: cost !== undefined ? cost : 0,
            customerName: actualCustomerName,
            customerPhone: actualCustomerPhone,
            partsUsed: partsUsed || [], 
            totalBill: totalBill !== undefined ? totalBill : 0 
        });

        await newService.save();

        // Populate the service object before emitting for full details on frontend
        const populatedService = await Service.findById(newService._id)
                                             .populate('vehicleId')
                                             .populate('user');
        io.emit('serviceUpdate', populatedService); // Emit the new service to all connected clients
        console.log('Emitted new service:', populatedService); // Log for debugging

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
  if (!req.user.isAdmin) {
      return res.status(403).json({ msg: 'Forbidden: Only administrators can perform this action.' });
  }

  const { date, type, description, cost, customerName, customerPhone, partsUsed, totalBill } = req.body; 

  try {
    let service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ msg: 'Service record not found' });
    }

    if (date !== undefined) service.date = date;
    if (type !== undefined) service.type = type;
    if (description !== undefined) service.description = description;
    if (cost !== undefined) service.cost = cost;
    if (customerName !== undefined) service.customerName = customerName;
    if (customerPhone !== undefined) service.customerPhone = customerPhone;
    
    if (partsUsed !== undefined) {
      service.partsUsed = partsUsed;
    }

    if (totalBill !== undefined) {
      service.totalBill = totalBill;
    }

    await service.save();

    // Populate the service object before emitting for full details on frontend
    const populatedService = await Service.findById(service._id)
                                         .populate('vehicleId')
                                         .populate('user');
    io.emit('serviceUpdate', populatedService); // Emit the updated service to all connected clients
    console.log('Emitted service update:', populatedService); // Log for debugging

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
    const { id } = req.params;
    const { status } = req.body;

    try {
        let service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        service.type = status; 
        await service.save();

        // Populate the service object before emitting for full details on frontend
        const populatedService = await Service.findById(service._id)
                                             .populate('vehicleId')
                                             .populate('user');
        io.emit('serviceUpdate', populatedService); // Emit the status update
        console.log('Emitted status update:', populatedService); // Log for debugging

        res.json({ msg: 'Service status updated successfully!', service });
    } catch (err) {
        console.error("Error updating service status:", err.message);
        res.status(500).send('Server Error while updating service status.');
    }
};

/**
 * @desc    Automatically cancels pending services that are older than 24 hours.
 * @access  Internal (called by a scheduled task)
 */
exports.autoCancelPendingServices = async () => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const updatedServices = await Service.find(
            {
                type: 'pending',
                date: { $lt: twentyFourHoursAgo }
            }
        );

        if (updatedServices.length > 0) {
            const result = await Service.updateMany(
                {
                    type: 'pending',
                    date: { $lt: twentyFourHoursAgo }
                },
                {
                    $set: { type: 'cancelled', description: 'Automatically cancelled due to no action within 24 hours.' }
                }
            );
            console.log(`Auto-cancellation: ${result.modifiedCount} pending services cancelled.`);

            // Emit updates for each cancelled service to trigger frontend refresh
            for (const service of updatedServices) {
                // Fetch the updated service to ensure it has the new status and populated fields
                const populatedService = await Service.findById(service._id)
                                                     .populate('vehicleId')
                                                     .populate('user');
                if (populatedService) {
                    io.emit('serviceUpdate', populatedService);
                    console.log('Emitted auto-cancelled service:', populatedService);
                }
            }
        }
    } catch (error) {
        console.error("Error during auto-cancellation of pending services:", error.message);
    }
};


// @route   GET api/services
// @desc    Get all services for the logged-in user OR all services if admin.
//          Admin can optionally filter out 'picked-up' AND 'cancelled' services via query param.
// @access  Private
exports.fetchServices = async (req, res) => {
    try {
        let services;
        const includePickedUp = req.query.includePickedUp === 'true';
        const forAdminCurrentView = req.query.forAdminCurrentView === 'true';

        if (req.user.isAdmin) {
            let query = {};
            if (forAdminCurrentView) {
                query.type = { $nin: ['picked-up', 'cancelled'] };
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
