require('dotenv').config();
const connectDB = require('./config/db');
const Room = require('./models/Room');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');

const segments = [
  'direct_walk_in', 'direct_phone_mail', 'direct_website',
  'ota_booking', 'ota_expedia', 'ota_hotels', 'ota_agoda', 'ota_airbnb',
  'b2b_agency', 'b2b_corporate'
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const seed = async () => {
  await Room.deleteMany({});
  await Booking.deleteMany({});
  await Payment.deleteMany({});

  const rooms = [];
  const categories = ['standard', 'standard', 'standard', 'superior', 'superior', 'suite', 'lodge'];
  for (let i = 1; i <= 30; i++) {
    rooms.push({
      roomNumber: String(i).padStart(3, '0'),
      category: categories[i % categories.length],
      floor: Math.ceil(i / 10),
      bedType: 'double',
      maxOccupancy: 2,
      housekeepingStatus: 'propre',
      isActive: true
    });
  }
  const createdRooms = await Room.insertMany(rooms);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const totalRooms = createdRooms.length;

  const bookingDocs = [];
  const paymentDocs = [];

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

      bookingDocs.push({
        bookingRef,
        roomId: room._id,
        status,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        actualCheckIn: checkIn,
        actualCheckOut: isPast ? checkOut : null,
        adults: rand(1, 3),
        children: rand(0, 2),
        boardType: pick(['bb', 'bb', 'bb', 'dp', 'pc']),
        roomRate: rate,
        totalAmount: rate * stayNights,
        deposit: Math.round(rate * stayNights * 0.3),
        marketSegment: segment,
        createdAt: new Date(checkIn.getTime() - 7 * 24 * 60 * 60 * 1000)
      });

      nightsCreated += stayNights;
    }
  }

  const createdBookings = await Booking.insertMany(bookingDocs);

  for (const b of createdBookings) {
    if (b.status === 'checked_out' || b.status === 'checked_in') {
      const nights = Math.ceil((b.checkOutDate - b.checkInDate) / (1000 * 60 * 60 * 24));
      const totalPaid = b.roomRate * nights;

      const paymentMethods = ['cb', 'esp', 'chq', 'virement', 'debiteur'];
      const method = b.marketSegment.startsWith('b2b') ? 'debiteur' : pick(paymentMethods);

      paymentDocs.push({
        bookingId: b._id,
        amount: totalPaid,
        paymentMethod: method,
        cardType: method === 'cb' ? pick(['visa', 'mastercard']) : null,
        processedAt: b.actualCheckOut || b.actualCheckIn
      });
    }
  }

  await Payment.insertMany(paymentDocs);

  console.log(`✅ Seed: ${createdRooms.length} chambres, ${createdBookings.length} réservations, ${paymentDocs.length} paiements`);
};

if (require.main === module) {
  connectDB().then(() => seed()).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
} else {
  module.exports = seed;
}
