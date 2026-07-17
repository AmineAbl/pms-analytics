const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');

const aggregateMonth = async (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = end.getDate();

  const totalRooms = await Room.countDocuments({ isActive: true });
  const totalRoomsAvailable = totalRooms * daysInMonth;

  const bookings = await Booking.find({
    checkInDate: { $lte: end },
    checkOutDate: { $gte: start }
  }).lean();

  const bookingIds = bookings.map(b => b._id);
  const payments = await Payment.find({ bookingId: { $in: bookingIds } }).lean();

  const paymentsByBooking = {};
  for (const p of payments) {
    const id = p.bookingId.toString();
    paymentsByBooking[id] = (paymentsByBooking[id] || 0) + p.amount;
  }

  let totalNights = 0;
  let totalRevenue = 0;
  let totalStayDays = 0;
  let activeBookings = 0;

  for (const b of bookings) {
    if (b.status !== 'checked_in' && b.status !== 'checked_out') continue;
    activeBookings++;

    const ci = b.checkInDate < start ? start : b.checkInDate;
    const co = b.checkOutDate > end ? end : b.checkOutDate;
    const nights = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
    totalNights += nights;
    totalRevenue += paymentsByBooking[b._id.toString()] || 0;

    const stayDays = Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / (1000 * 60 * 60 * 24));
    totalStayDays += stayDays;
  }

  return {
    totalRooms,
    totalNights,
    totalRevenue,
    occupancyRate: totalRoomsAvailable > 0 ? parseFloat(((totalNights / totalRoomsAvailable) * 100).toFixed(2)) : 0,
    adr: totalNights > 0 ? parseFloat((totalRevenue / totalNights).toFixed(2)) : 0,
    revpar: totalRoomsAvailable > 0 ? parseFloat((totalRevenue / totalRoomsAvailable).toFixed(2)) : 0,
    avgStayDuration: activeBookings > 0 ? parseFloat((totalStayDays / activeBookings).toFixed(1)) : 0,
    activeBookings
  };
};

exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const current = await aggregateMonth(year, month);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prev = await aggregateMonth(prevYear, prevMonth);

    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const totalRooms = current.totalRooms;

    const todayBookings = await Booking.find({
      checkInDate: { $lte: dayEnd },
      checkOutDate: { $gte: dayStart },
      status: { $in: ['checked_in', 'checked_out'] }
    }).lean();

    let dailyNights = 0;
    let dailyRevenue = 0;
    const todayIds = todayBookings.map(b => b._id);
    const todayPayments = todayIds.length > 0 ? await Payment.find({ bookingId: { $in: todayIds } }).lean() : [];
    const todayPayMap = {};
    for (const p of todayPayments) {
      todayPayMap[p.bookingId.toString()] = (todayPayMap[p.bookingId.toString()] || 0) + p.amount;
    }
    for (const b of todayBookings) {
      const ci = b.checkInDate < dayStart ? dayStart : b.checkInDate;
      const co = b.checkOutDate > dayEnd ? dayEnd : b.checkOutDate;
      dailyNights += Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
      dailyRevenue += todayPayMap[b._id.toString()] || 0;
    }

    const delta = (cur, prv) => prv > 0 ? parseFloat(((cur - prv) / prv * 100).toFixed(1)) : null;

    res.json({
      period: { year, month },
      kpis: {
        toMensuel: { value: current.occupancyRate, prevValue: prev.occupancyRate, evolution: delta(current.occupancyRate, prev.occupancyRate) },
        toJournalier: { value: totalRooms > 0 ? parseFloat(((dailyNights / totalRooms) * 100).toFixed(2)) : 0, prevValue: null, evolution: null },
        adr: { value: current.adr, prevValue: prev.adr, evolution: delta(current.adr, prev.adr) },
        revpar: { value: current.revpar, prevValue: prev.revpar, evolution: delta(current.revpar, prev.revpar) },
        dms: { value: current.avgStayDuration, prevValue: prev.avgStayDuration, evolution: delta(current.avgStayDuration, prev.avgStayDuration) },
        caMensuel: { value: current.totalRevenue, prevValue: prev.totalRevenue, evolution: delta(current.totalRevenue, prev.totalRevenue) }
      },
      raw: { current, prev }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const stats = await aggregateMonth(targetYear, m);
      months.push({ month: m, ...stats });
    }

    res.json({ year: targetYear, months });
  } catch (err) {
    console.error('Trend error:', err);
    res.status(500).json({ error: err.message });
  }
};
