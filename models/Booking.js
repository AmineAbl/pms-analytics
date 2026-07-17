const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingRef: String,
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', default: null },
  status: String,
  checkInDate: Date,
  checkOutDate: Date,
  actualCheckIn: Date,
  actualCheckOut: Date,
  adults: Number,
  children: Number,
  boardType: String,
  roomRate: Number,
  totalAmount: Number,
  deposit: Number,
  marketSegment: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, collection: 'bookings' });

module.exports = mongoose.model('Booking', bookingSchema);
