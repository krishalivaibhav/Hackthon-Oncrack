const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Simple registration route
router.post('/register', (req, res) => {
  console.log('Registration attempt:', req.body);
  const { name, email, password } = req.body;
  
  // For now, we'll just create a token directly
  // In a real app, you'd save this to a database
  const token = jwt.sign({ email, name }, 'your-secret-key', { expiresIn: '1h' });
  console.log('Registration successful for:', email);
  res.json({ token });
});

// Simple login route
router.post('/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { email, password } = req.body;
  
  // Hardcoded credentials for testing
  if (email === 'vaibhav.krishali@gmail.com' && password === 'Vaibhav.,12') {
    console.log('Login successful for:', email);
    const token = jwt.sign({ email }, 'your-secret-key', { expiresIn: '1h' });
    res.json({ token });
  } else {
    console.log('Login failed for:', email);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Google OAuth route
router.get('/google', (req, res) => {
  // For now, we'll just create a token directly
  // In a real app, you'd implement proper Google OAuth
  const token = jwt.sign({ email: 'google-user@example.com' }, 'your-secret-key', { expiresIn: '1h' });
  res.json({ token });
});

// Verify token
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Token verification attempt');
  
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    console.log('Token verified for:', decoded.email);
    res.json({ email: decoded.email });
  } catch (error) {
    console.log('Token verification failed:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router; 