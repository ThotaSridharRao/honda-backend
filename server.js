// Load environment variables from .env file.
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

// --- CORS Configuration ---
const allowedOrigins = [
  'https://maosaji-honda.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Handle OPTIONS requests
app.options('*', cors(corsOptions));
// --- End CORS Configuration ---

// Enable express to parse JSON bodies from incoming requests.
app.use(express.json());

// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'honda_service'
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