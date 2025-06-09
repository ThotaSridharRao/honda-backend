const User = require('../models/user'); // Adjust path as needed
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, isAdmin } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with this email' });
    }

    // Create a new user instance
    user = new User({
      name,
      email,
      password,
      isAdmin: isAdmin || false // Set isAdmin based on input or default to false
    });

    // Hash password
    const salt = await bcrypt.genSalt(10); // Generate a salt for hashing
    user.password = await bcrypt.hash(password, salt); // Hash the user's password

    // Save the user to the database
    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id, // MongoDB's _id field
        isAdmin: user.isAdmin
      }
    };

    // Sign the token
    // Replace 'your_jwt_secret' with a strong, unique secret key.
    // Set expiresIn to a reasonable duration (e.g., '1h' for 1 hour).
    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Use an environment variable for your secret
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, msg: 'User registered successfully!' }); // Send the token back to the client
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during registration');
  }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (login)
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Compare provided password with hashed password in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };

    // Sign the token
    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Use an environment variable for your secret
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, msg: 'Logged in successfully!' }); // Send the token
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error during login');
  }
};
