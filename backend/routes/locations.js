const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const passport = require('passport');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get all saved locations for the current user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const locations = await Location.find({ savedBy: req.user._id });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching locations' });
  }
});

// Save a new location
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { name, coordinates, aqi } = req.body;
    const location = new Location({
      name,
      coordinates,
      aqi,
      savedBy: req.user._id
    });
    await location.save();
    res.status(201).json(location);
  } catch (error) {
    res.status(400).json({ error: 'Error saving location' });
  }
});

// Update a location
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const location = await Location.findOneAndUpdate(
      { _id: req.params.id, savedBy: req.user._id },
      req.body,
      { new: true }
    );
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(400).json({ error: 'Error updating location' });
  }
});

// Delete a location
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const location = await Location.findOneAndDelete({
      _id: req.params.id,
      savedBy: req.user._id
    });
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting location' });
  }
});

module.exports = router; 