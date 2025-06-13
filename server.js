// Load environment variables from .env file.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors

// Import your route modules
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

// Initialize the Express application
const app = express();

// --- CORS Configuration ---
// Define your frontend's origin(s).
// IMPORTANT: Replace 'https://your-frontend-domain.onrender.com' with the actual URL of your deployed frontend.
// If you are testing locally, you can add 'http://localhost:port' as well.
const allowedOrigins = [
  'https://maosaji-honda.onrender.com', // <--- THIS IS YOUR FRONTEND'S DEPLOYED URL!
  // 'http://localhost:3000', // Example for local frontend development (adjust port if needed)
  // 'http://127.0.0.1:5500', // Example if you're using VS Code Live Server for frontend
  // Add any other domains your frontend might be hosted on
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // or if the origin is in our allowedOrigins list.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}.`;
      callback(new Error(msg), false);
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow specific HTTP methods
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 200
};

app.use(cors(corsOptions)); // Apply CORS middleware with explicit options
// --- End CORS Configuration ---


// Enable express to parse JSON bodies from incoming requests.
app.use(express.json());


// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'honda_service' // Explicitly specify the database name
})
  .then(() => console.log("MongoDB connected successfully to honda_service"))
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
