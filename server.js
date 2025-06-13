// Load environment variables from .env file.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import your route modules
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const serviceController = require('./controllers/serviceController'); // Import serviceController

// Initialize the Express application
const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
  'https://maosaji-honda.onrender.com', // Your frontend URL
  // 'http://localhost:3000', // Example for local frontend development (adjust port if needed)
  // 'http://127.0.0.1:5500', // Example if you're using VS Code Live Server for frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}.`;
      callback(new Error(msg), false);
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'], // Explicitly allow OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'x-auth-token'], // Allow necessary headers
  credentials: true,
  optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 200
};

app.use(cors(corsOptions));
// Handle OPTIONS requests for all routes to ensure preflight works
app.options('*', cors(corsOptions));
// --- End CORS Configuration ---


// Enable express to parse JSON bodies from incoming requests.
app.use(express.json());


// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'honda_service' // Explicitly specify the database name
})
  .then(() => {
    console.log("MongoDB connected successfully to honda_service");
    // Schedule the auto-cancellation task AFTER database connection is established
    // Runs every 60 minutes (60 * 60 * 1000 milliseconds)
    setInterval(serviceController.autoCancelPendingServices, 60 * 60 * 1000); 
    console.log("Auto-cancellation task scheduled to run every 60 minutes.");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/services', serviceRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
