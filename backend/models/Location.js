const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  coordinates: {
    type: {
      lat: Number,
      lng: Number
    },
    required: true
  },
  aqi: {
    type: Number,
    required: true
  },
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Location', locationSchema); 