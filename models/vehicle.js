const mongoose = require('mongoose');

// Define the Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  // Reference to the User who owns this vehicle
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Specifies that this field will store MongoDB ObjectId
    ref: 'User', // References the 'User' model (defined in user.js)
    required: true // A vehicle must be associated with a user
  },
  make: {
    type: String,
    required: true // Make of the vehicle (e.g., Honda, Toyota)
  },
  model: {
    type: String,
    required: true // Model of the vehicle (e.g., Civic, Camry)
  },
  year: {
    type: Number,
    required: true // Manufacturing year of the vehicle
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true // Unique license plate for the vehicle
  },
  // You can add more fields here like color, VIN, etc.
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Export the Vehicle model
module.exports = mongoose.model('Vehicle', vehicleSchema);
