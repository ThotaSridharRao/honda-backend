const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    // Verify the token using your JWT secret.
    // Replace 'your_jwt_secret' with a strong, unique secret key.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user (from the token payload) to the request object
    req.user = decoded.user;
    next(); // Move to the next middleware/route handler
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
