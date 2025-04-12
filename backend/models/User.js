const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String
  },
  avatar: {
    type: String
  },
  savedLocations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema); 