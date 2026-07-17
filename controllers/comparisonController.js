const { eq, and, lte, gte, inArray, count } = require('drizzle-orm');
const db = require('../config/database');
const bookingsTable = require('../schema/bookings');
const roomsTable = require('../schema/rooms');
const paymentsTable = require('../schema/payments');

const computeStats = async (year, month, segment) => {
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString().slice(0, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const [{ totalRooms }] = await db
    .select({ totalRooms: count() })
    .from(roomsTable)
    .where(eq(roomsTable.isActive, true));

  const totalRoomsAvailable = totalRooms * daysInMonth;

  const conditions = [
    lte(bookingsTable.checkInDate, end),
    gte(bookingsTable.checkOutDate, start),
    inArray(bookingsTable.status, ['checked_in', 'checked_out'])
  ];
  if (segment) conditions.push(eq(bookingsTable.marketSegment, segment));

  const monthBookings = await db
    .select()
    .from(bookingsTable)
    .where(and(...conditions));

  const bookingIds = monthBookings.map(b => b.id);
  const monthPayments = bookingIds.length > 0
    ? await db.select().from(paymentsTable).where(inArray(paymentsTable.bookingId, bookingIds))
    : [];
  const payMap = {};
  for (const p of monthPayments) {
    payMap[p.bookingId] = (payMap[p.bookingId] || 0) + parseFloat(p.amount);
  }

  let totalNights = 0;
  let totalRevenue = 0;

  for (const b of monthBookings) {
    const ci = b.checkInDate < start ? start : b.checkInDate;
    const co = b.checkOutDate > end ? end : b.checkOutDate;
    totalNights += Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
    totalRevenue += payMap[b.id] || 0;
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
