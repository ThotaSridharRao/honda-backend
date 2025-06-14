// Load environment variables from .env file.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // Import http module
const { Server } = require('socket.io'); // Import Server from socket.io

// Import your route modules
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const serviceController = require('./controllers/serviceController'); // Import serviceController for auto-cancellation

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

// Create HTTP server for Express and Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Use your existing allowedOrigins for CORS
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true
  }
});

// Make 'io' instance globally accessible or pass it
// For simplicity, we'll export it and import in controllers that need to emit events
module.exports.io = io; 

io.on('connection', (socket) => {
  console.log('A user connected to WebSocket:', socket.id);
  // You can add more complex authentication/authorization for sockets here later
  socket.on('disconnect', () => {
    console.log('User disconnected from WebSocket:', socket.id);
  });
});


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

// Use server.listen instead of app.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
