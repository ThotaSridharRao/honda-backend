const mongoose = require('mongoose');

// Define the Service Schema
const serviceSchema = new mongoose.Schema({
  // Reference to the User for whom this service was performed (vehicle owner)
  user: {
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
    enum: ['pending', 'in-progress', 'completed', 'ready-for-pickup','picked-up', 'cancelled', 'Oil Change', 'Tire Rotation', 'Brake Inspection', 'Engine Diagnostic', 'Fluid Check', 'Other'],
    default: 'pending' // Default status for a new service
  },
  description: {
    type: String,
    required: false // Detailed description of the service
  },
  cost: {
    type: Number,
    required: false,
    default: 0 // Cost of the service. This will now be the 'estimated cost' or initial cost.
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
  // --- NEW FIELDS FOR FEATURE 6 ---
  // To store a list of parts used and their costs
  partsUsed: [
    {
      partName: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1
      },
      unitCost: {
        type: Number,
        required: true,
        default: 0
      }
    }
  ],
  // To store the final total bill after all services and parts are accounted for
  totalBill: {
    type: Number,
    required: false, // Make it optional in schema, logic will set default/calculate
    default: 0
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Export the Service model
module.exports = mongoose.model('Service', serviceSchema);
