const mongoose = require('mongoose');

// Define the Service Schema
const serviceSchema = new mongoose.Schema({
  // Reference to the User for whom this service was performed
  userId: {
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
  type: {
    type: String,
    required: true,
    enum: ['Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Diagnostic', 'Fluid Check', 'Other'] // Type of service performed
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
  // You can add more fields here like mileage at service, next due date, etc.
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Export the Service model
module.exports = mongoose.model('Service', serviceSchema);
