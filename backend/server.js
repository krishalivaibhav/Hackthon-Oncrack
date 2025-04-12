const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const airQualityRoutes = require('./routes/airQuality');

const app = express();
const PORT = 5001;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/air-quality', airQualityRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 