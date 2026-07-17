const mongoose = require('mongoose');

const monthlyStatsSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  totalRooms: Number,
  roomsSold: Number,
  totalNights: Number,
  totalRevenue: Number,
  adr: Number,
  revpar: Number,
  occupancyRate: Number,
  avgStayDuration: Number,
  segmentBreakdown: [{
    segment: String,
    nights: Number,
    revenue: Number,
    adr: Number,
    occupancyRate: Number
  }]
}, { timestamps: true });

monthlyStatsSchema.index({ year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyStats', monthlyStatsSchema);
