const { pgTable, uuid, varchar, decimal, timestamp, index } = require('drizzle-orm/pg-core');
const bookings = require('./bookings');

const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
  cardType: varchar('card_type', { length: 20 }),
  reference: varchar('reference', { length: 100 }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  bookingIdIdx: index('idx_payments_booking_id').on(table.bookingId),
}));

module.exports = payments;
