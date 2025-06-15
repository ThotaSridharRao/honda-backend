// Load environment variables from .env file.
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors
const http = require('http'); // Import http module
const { Server } = require('socket.io'); // Import Server from socket.io

// Define allowedOrigins *before* it is used by io and corsOptions
const allowedOrigins = [
  'https://maosaji-honda.onrender.com', // Corrected to match the origin from the error screenshot
  // 'http://localhost:3000', // Example for local frontend development (adjust port if needed)
  // 'http://127.0.0.1:5500', // Example if you're using VS Code Live Server for frontend
  // Add any other domains your frontend might be hosted on
];


// Import your route modules
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const serviceRoutes = require('./routes/serviceRoutes'); // This will remain a direct router object for now


const app = express();
const server = http.createServer(app); // Create HTTP server for Express and Socket.IO

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Be more inclusive for Socket.IO CORS
    credentials: true
  }
});

// IMPORTANT NEW LINE: Make 'io' instance accessible throughout the Express app via req.app.get('io')
app.set('io', io); 

io.on('connection', (socket) => {
  console.log('User connected to WebSocket:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected from WebSocket:', socket.id);
  });
});


// --- CORS Configuration for Express Routes ---
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}.`;
      callback(new Error(msg), false);
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow specific HTTP methods for Express
  allowedHeaders: ['Content-Type', 'x-auth-token'], // Allow necessary headers
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 200
};

app.use(cors(corsOptions)); // Apply CORS middleware with explicit options for Express
// Handle OPTIONS requests for all Express routes to ensure preflight works
app.options('*', cors(corsOptions));
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


app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log('Route registered:', r.route.path);
  }
});


// Basic test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen to start the HTTP server (which also hosts Socket.IO)
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
