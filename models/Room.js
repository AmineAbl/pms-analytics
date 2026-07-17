const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: String,
  category: String,
  floor: Number,
  bedType: String,
  maxOccupancy: Number,
  housekeepingStatus: String,
  blockReason: String,
  isActive: Boolean
}, { timestamps: true, collection: 'rooms' });

module.exports = mongoose.model('Room', roomSchema);
