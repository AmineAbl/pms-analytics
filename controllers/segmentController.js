const { eq, and, lte, gte, inArray } = require('drizzle-orm');
const db = require('../config/database');
const bookingsTable = require('../schema/bookings');
const paymentsTable = require('../schema/payments');

const SEGMENT_LABELS = {
  direct_walk_in: 'Direct - Walk-in',
  direct_phone_mail: 'Direct - Tel/Email',
  direct_website: 'Direct - Site Web',
  ota_booking: 'OTA - Booking.com',
  ota_expedia: 'OTA - Expedia',
  ota_hotels: 'OTA - Hotels.com',
  ota_agoda: 'OTA - Agoda',
  ota_airbnb: 'OTA - Airbnb',
  b2b_agency: 'Agence / TO',
  b2b_corporate: 'Corporate / Société'
};

const SEGMENT_GROUPS = {
  DIRECT: ['direct_walk_in', 'direct_phone_mail', 'direct_website'],
  OTA: ['ota_booking', 'ota_expedia', 'ota_hotels', 'ota_agoda', 'ota_airbnb'],
  PARTENAIRES: ['b2b_agency', 'b2b_corporate']
};

exports.getSegmentDistribution = async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, m, 0, 23, 59, 59, 999).toISOString().slice(0, 10);

    const monthBookings = await db
      .select()
      .from(bookingsTable)
      .where(and(
        lte(bookingsTable.checkInDate, end),
        gte(bookingsTable.checkOutDate, start),
        inArray(bookingsTable.status, ['checked_in', 'checked_out'])
      ));

    const bookingIds = monthBookings.map(b => b.id);
    const monthPayments = bookingIds.length > 0
      ? await db.select().from(paymentsTable).where(inArray(paymentsTable.bookingId, bookingIds))
      : [];
    const payMap = {};
    for (const p of monthPayments) {
      payMap[p.bookingId] = (payMap[p.bookingId] || 0) + parseFloat(p.amount);
    }

    const segData = {};
    for (const b of monthBookings) {
      const seg = b.marketSegment;
      if (!segData[seg]) segData[seg] = { nights: 0, revenue: 0 };
      const ci = b.checkInDate < start ? start : b.checkInDate;
      const co = b.checkOutDate > end ? end : b.checkOutDate;
      segData[seg].nights += Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
      segData[seg].revenue += payMap[b.id] || 0;
    }

    const totalNights = Object.values(segData).reduce((s, v) => s + v.nights, 0);

    const pieChart = Object.entries(segData).map(([segment, data]) => ({
      segment,
      label: SEGMENT_LABELS[segment] || segment,
      nights: data.nights,
      percentage: totalNights > 0 ? parseFloat(((data.nights / totalNights) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.nights - a.nights);

    const barChart = Object.entries(segData).map(([segment, data]) => ({
      segment,
      label: SEGMENT_LABELS[segment] || segment,
      revenue: data.revenue
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({
      period: { year: y, month: m },
      totalNights,
      pieChart,
      barChart
    });
  } catch (err) {
    console.error('Segment distribution error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlySegmentTrend = async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();

    const months = [];

    for (let m = 1; m <= 12; m++) {
      const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const end = new Date(y, m, 0, 23, 59, 59, 999).toISOString().slice(0, 10);

      const monthBookings = await db
        .select()
        .from(bookingsTable)
        .where(and(
          lte(bookingsTable.checkInDate, end),
          gte(bookingsTable.checkOutDate, start),
          inArray(bookingsTable.status, ['checked_in', 'checked_out'])
        ));

      const bookingIds = monthBookings.map(b => b.id);
      const monthPayments = bookingIds.length > 0
        ? await db.select().from(paymentsTable).where(inArray(paymentsTable.bookingId, bookingIds))
        : [];
      const payMap = {};
      for (const p of monthPayments) {
        payMap[p.bookingId] = (payMap[p.bookingId] || 0) + parseFloat(p.amount);
      }

      const segData = {};
      for (const b of monthBookings) {
        const seg = b.marketSegment;
        if (!segData[seg]) segData[seg] = { nights: 0, revenue: 0 };
        const ci = b.checkInDate < start ? start : b.checkInDate;
        const co = b.checkOutDate > end ? end : b.checkOutDate;
        segData[seg].nights += Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
        segData[seg].revenue += payMap[b.id] || 0;
      }

      months.push({
        month: m,
        segments: Object.entries(segData).map(([segment, data]) => ({
          segment,
          label: SEGMENT_LABELS[segment] || segment,
          nights: data.nights,
          revenue: data.revenue,
          adr: data.nights > 0 ? parseFloat((data.revenue / data.nights).toFixed(2)) : 0
        }))
      });
    }

    res.json({ year: y, months });
  } catch (err) {
    console.error('Segment trend error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getSegmentList = (req, res) => {
  res.json({
    segments: Object.entries(SEGMENT_LABELS).map(([code, label]) => ({ code, label })),
    groups: SEGMENT_GROUPS
  });
};
