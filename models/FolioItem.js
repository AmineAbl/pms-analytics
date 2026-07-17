const mongoose = require('mongoose');

const folioItemSchema = new mongoose.Schema({
  folioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folio' },
  description: String,
  category: String,
  quantity: Number,
  unitPrice: Number,
  totalAmount: Number,
  taxRate: Number,
  isVisibleOnPrint: Boolean,
  date: Date,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, collection: 'folioitems' });

module.exports = mongoose.model('FolioItem', folioItemSchema);
