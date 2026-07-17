const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

const computeStats = async (year, month, segment) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = end.getDate();

  const totalRooms = await Room.countDocuments({ isActive: true });
  const totalRoomsAvailable = totalRooms * daysInMonth;

  const query = {
    checkInDate: { $lte: end },
    checkOutDate: { $gte: start },
    status: { $in: ['checked_in', 'checked_out'] }
  };
  if (segment) query.marketSegment = segment;

  const bookings = await Booking.find(query).lean();
  const bookingIds = bookings.map(b => b._id);
  const payments = bookingIds.length > 0 ? await Payment.find({ bookingId: { $in: bookingIds } }).lean() : [];
  const payMap = {};
  for (const p of payments) {
    payMap[p.bookingId.toString()] = (payMap[p.bookingId.toString()] || 0) + p.amount;
  }

  let totalNights = 0;
  let totalRevenue = 0;

  for (const b of bookings) {
    const ci = b.checkInDate < start ? start : b.checkInDate;
    const co = b.checkOutDate > end ? end : b.checkOutDate;
    totalNights += Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
    totalRevenue += payMap[b._id.toString()] || 0;
  }

  return {
    totalRooms,
    totalNights,
    totalRevenue,
    occupancyRate: totalRoomsAvailable > 0 ? parseFloat(((totalNights / totalRoomsAvailable) * 100).toFixed(2)) : 0,
    adr: totalNights > 0 ? parseFloat((totalRevenue / totalNights).toFixed(2)) : 0,
    revpar: totalRoomsAvailable > 0 ? parseFloat((totalRevenue / totalRoomsAvailable).toFixed(2)) : 0
  };
};

exports.compareYTD = async (req, res) => {
  try {
    const { year, segment } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const prevYear = currentYear - 1;
    const currentMonth = new Date().getMonth() + 1;

    const comparison = [];

    for (let m = 1; m <= currentMonth; m++) {
      const current = await computeStats(currentYear, m, segment);
      const prev = await computeStats(prevYear, m, segment);

      const delta = (cur, prv) => prv > 0 ? parseFloat(((cur - prv) / prv * 100).toFixed(1)) : null;

      comparison.push({
        month: m,
        current: { occupancyRate: current.occupancyRate, adr: current.adr, revpar: current.revpar, revenue: current.totalRevenue, nights: current.totalNights },
        previous: { occupancyRate: prev.occupancyRate, adr: prev.adr, revpar: prev.revpar, revenue: prev.totalRevenue, nights: prev.totalNights },
        deltas: {
          occupancyRate: delta(current.occupancyRate, prev.occupancyRate),
          adr: delta(current.adr, prev.adr),
          revpar: delta(current.revpar, prev.revpar),
          revenue: delta(current.totalRevenue, prev.totalRevenue)
        }
      });
    }

    res.json({
      period: { currentYear, prevYear, upToMonth: currentMonth },
      segment: segment || 'all',
      comparison
    });
  } catch (err) {
    console.error('YTD comparison error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.compareMonthly = async (req, res) => {
  try {
    const { year, month, segment } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const current = await computeStats(y, m, segment);
    const prev = await computeStats(y - 1, m, segment);

    const delta = (cur, prv) => prv > 0 ? parseFloat(((cur - prv) / prv * 100).toFixed(1)) : null;

    res.json({
      period: { current: { year: y, month: m }, previous: { year: y - 1, month: m } },
      segment: segment || 'all',
      current,
      previous: prev,
      deltas: {
        occupancyRate: delta(current.occupancyRate, prev.occupancyRate),
        adr: delta(current.adr, prev.adr),
        revpar: delta(current.revpar, prev.revpar),
        revenue: delta(current.totalRevenue, prev.totalRevenue)
      }
    });
  } catch (err) {
    console.error('Monthly comparison error:', err);
    res.status(500).json({ error: err.message });
  }
};
