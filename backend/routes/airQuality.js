const express = require('express');
const router = express.Router();

// Mock air quality data for development
const mockAirQualityData = {
  aqi: 45,
  pollutants: {
    pm2_5: 12.5,
    pm10: 25.0,
    no2: 0.05,
    o3: 0.03
  }
};

// Get air quality data for a location
router.get('/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    // In a real application, you would fetch this data from an external API
    // For now, we'll return mock data
    res.json({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      ...mockAirQualityData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    res.status(500).json({ message: 'Error fetching air quality data' });
  }
});

module.exports = router; 