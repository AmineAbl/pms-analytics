const mongoose = require('mongoose');

const dailySnapshotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  totalRooms: Number,
  roomsSold: Number,
  roomsAvailable: Number,
  occupancyRate: Number,
  adr: Number,
  revpar: Number,
  totalRevenue: Number,
  totalPax: Number,
  avgStayDuration: Number,
  segmentBreakdown: [{
    segment: String,
    nights: Number,
    revenue: Number,
    adr: Number
  }]
}, { timestamps: true });

dailySnapshotSchema.index({ date: -1 });

module.exports = mongoose.model('DailySnapshot', dailySnapshotSchema);
