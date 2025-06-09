// Load environment variables from .env file.
// This should be at the very top of your main server file.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import your route modules
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

// Initialize the Express application
const app = express();

// Middleware setup
// Enable Cross-Origin Resource Sharing (CORS) for all origins.
// In a production environment, you should configure CORS to restrict access
// to specific origins for security.
app.use(cors());

// Enable express to parse JSON bodies from incoming requests.
// This allows you to receive JSON data in `req.body`.
app.use(express.json());

// Connect to MongoDB database
// The connection URI is fetched from the environment variables (process.env.MONGO_URI).
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'honda_service' // <--- Add this line
})
  .then(() => console.log("MongoDB connected successfully")) // Log success message on successful connection
  .catch((err) => console.error("MongoDB connection error:", err)); // Log error message if connection fails

// Route mounting
// Mount the imported route modules to specific base paths.
// All routes defined in authRoutes will be prefixed with '/api/auth'.
app.use('/api/auth', authRoutes);
// All routes defined in vehicleRoutes will be prefixed with '/api/vehicles'.
app.use('/api/vehicles', vehicleRoutes);
// All routes defined in serviceRoutes will be prefixed with '/api/services'.
app.use('/api/services', serviceRoutes);

// Define the port for the server to listen on.
// It tries to use the PORT environment variable, otherwise defaults to 5000.
const PORT = process.env.PORT || 5000;

// Start the server and listen for incoming requests on the specified port.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
