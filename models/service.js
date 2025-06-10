const mongoose = require('mongoose');

// Define the Service Schema
const serviceSchema = new mongoose.Schema({
  // Reference to the User for whom this service was performed (vehicle owner)
  user: { // Renamed from userId for clarity to match controller's 'user: vehicle.owner'
    type: mongoose.Schema.Types.ObjectId, // Specifies that this field will store MongoDB ObjectId
    ref: 'User', // References the 'User' model
    required: true // A service must be associated with a user
  },
  // Reference to the Vehicle on which this service was performed
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId, // Specifies that this field will store MongoDB ObjectId
    ref: 'Vehicle', // References the 'Vehicle' model
    required: true // A service must be associated with a vehicle
  },
  date: {
    type: Date,
    required: true,
    default: Date.now // Date when the service was performed, defaults to current date
  },
  type: { // This field acts as the service status (e.g., "Pending", "In Progress")
    type: String,
    required: true,
    // Add more granular statuses as needed or use the initial ones from admin form
    enum: ['pending', 'in-progress', 'completed', 'ready-for-pickup', 'cancelled', 'Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Diagnostic', 'Fluid Check', 'Other'],
    default: 'pending' // Default status for a new service
  },
  description: {
    type: String,
    required: false // Detailed description of the service
  },
  cost: {
    type: Number,
    required: false,
    default: 0 // Cost of the service
  },
  // New fields for customer name and phone, which come from the admin form
  customerName: {
    type: String,
    required: true // Customer's name at the time of service assignment
  },
  customerPhone: {
    type: String,
    required: true // Customer's phone at the time of service assignment
  },
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Export the Service model
module.exports = mongoose.model('Service', serviceSchema);
