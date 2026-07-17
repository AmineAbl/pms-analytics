const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  folioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folio' },
  amount: Number,
  paymentMethod: String,
  cardType: String,
  reference: String,
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date
}, { timestamps: true, collection: 'payments' });

module.exports = mongoose.model('Payment', paymentSchema);
