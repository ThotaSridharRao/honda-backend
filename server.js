// Load environment variables from .env file.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // Import http module for Socket.IO
const { Server } = require('socket.io'); // Import Server from socket.io

// Import your route modules (these will be functions now)
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const serviceRoutes = require('./routes/serviceRoutes'); // Will be a function

// Import serviceController (only for the auto-cancellation scheduler)
const serviceController = require('./controllers/serviceController'); 

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
app.options('*', cors(corsOptions)); // Handle OPTIONS preflight requests
// --- End CORS Configuration ---


// Enable express to parse JSON bodies from incoming requests.
app.use(express.json());

// Create HTTP server for Express and Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO server and attach to the HTTP server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Socket.IO CORS should also match your frontend origin(s)
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('A user connected to WebSocket:', socket.id);
  // Basic logging for connection/disconnection
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
    // Pass 'io' to the auto-cancellation function as well
    setInterval(() => serviceController.autoCancelPendingServices(io), 60 * 60 * 1000); 
    console.log("Auto-cancellation task scheduled to run every 60 minutes.");
  })
  .catch((err) => console.error("MongoDB connection error:", err));


// Route mounting - Pass the 'io' instance to routes that need to emit events
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
// For services, we pass the io instance because serviceController needs it
app.use('/api/services', serviceRoutes(io)); 

// Basic test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Start the HTTP server (which also hosts Socket.IO)
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
