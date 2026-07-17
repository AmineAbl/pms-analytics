require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('./schema');
const roomsTable = require('./schema/rooms');
const bookingsTable = require('./schema/bookings');
const paymentsTable = require('./schema/payments');

const segments = [
  'direct_walk_in', 'direct_phone_mail', 'direct_website',
  'ota_booking', 'ota_expedia', 'ota_hotels', 'ota_agoda', 'ota_airbnb',
  'b2b_agency', 'b2b_corporate'
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const seed = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  await db.delete(paymentsTable);
  await db.delete(bookingsTable);
  await db.delete(roomsTable);

  const roomData = [];
  const categories = ['standard', 'standard', 'standard', 'superior', 'superior', 'suite', 'lodge'];
  for (let i = 1; i <= 30; i++) {
    roomData.push({
      roomNumber: String(i).padStart(3, '0'),
      category: categories[i % categories.length],
      floor: Math.ceil(i / 10),
      bedType: 'double',
      maxOccupancy: 2,
      housekeepingStatus: 'propre',
      isActive: true
    });
  }

  const createdRooms = await db.insert(roomsTable).values(roomData).returning();

  const now = new Date();
  const currentYear = now.getFullYear();
  const totalRooms = createdRooms.length;

  const bookingData = [];
  const paymentData = [];

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(currentYear, m, 0).getDate();
    const targetNights = Math.round(totalRooms * daysInMonth * (0.45 + Math.random() * 0.35));

    let nightsCreated = 0;
    let bookingIndex = 0;

    while (nightsCreated < targetNights) {
      const segment = pick(segments);
      const room = pick(createdRooms);
      const stayNights = rand(1, 5);
      const dayStart = rand(1, Math.max(1, daysInMonth - stayNights));

      const checkIn = new Date(currentYear, m - 1, dayStart);
      const checkOut = new Date(currentYear, m - 1, dayStart + stayNights);

      const rates = { standard: 800, superior: 1200, suite: 2000, lodge: 2500 };
      const rate = rates[room.category] + rand(-100, 200);

      const isPast = checkOut < now;
      const status = isPast ? 'checked_out' : (checkIn <= now && checkOut >= now ? 'checked_in' : 'confirmed');

      const bookingRef = `BK-${String(currentYear).slice(2)}${String(m).padStart(2, '0')}${String(bookingIndex++).padStart(4, '0')}`;

      bookingData.push({
        bookingRef,
        roomId: room.id,
        status,
        checkInDate: checkIn.toISOString().slice(0, 10),
        checkOutDate: checkOut.toISOString().slice(0, 10),
        actualCheckIn: checkIn.toISOString().slice(0, 10),
        actualCheckOut: isPast ? checkOut.toISOString().slice(0, 10) : null,
        adults: rand(1, 3),
        children: rand(0, 2),
        boardType: pick(['bb', 'bb', 'bb', 'dp', 'pc']),
        roomRate: String(rate),
        totalAmount: String(rate * stayNights),
        deposit: String(Math.round(rate * stayNights * 0.3)),
        marketSegment: segment,
        createdAt: new Date(checkIn.getTime() - 7 * 24 * 60 * 60 * 1000)
      });

      nightsCreated += stayNights;
    }
  }

  const createdBookings = await db.insert(bookingsTable).values(bookingData).returning();

  for (const b of createdBookings) {
    if (b.status === 'checked_out' || b.status === 'checked_in') {
      const nights = Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / (1000 * 60 * 60 * 24));
      const totalPaid = parseFloat(b.roomRate) * nights;

      const paymentMethods = ['cb', 'esp', 'chq', 'virement', 'debiteur'];
      const method = b.marketSegment.startsWith('b2b') ? 'debiteur' : pick(paymentMethods);

      paymentData.push({
        bookingId: b.id,
        amount: String(totalPaid),
        paymentMethod: method,
        cardType: method === 'cb' ? pick(['visa', 'mastercard']) : null,
        processedAt: b.actualCheckOut || b.actualCheckIn
      });
    }
  }

  if (paymentData.length > 0) {
    await db.insert(paymentsTable).values(paymentData);
  }

  console.log(`Seed: ${createdRooms.length} chambres, ${createdBookings.length} réservations, ${paymentData.length} paiements`);
  await pool.end();
};

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
} else {
  module.exports = seed;
}
