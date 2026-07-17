const { pgTable, uuid, varchar, integer, decimal, timestamp, date, index } = require('drizzle-orm/pg-core');
const rooms = require('./rooms');

const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingRef: varchar('booking_ref', { length: 30 }).notNull(),
  roomId: uuid('room_id').notNull().references(() => rooms.id),
  status: varchar('status', { length: 20 }).notNull(),
  checkInDate: date('check_in_date').notNull(),
  checkOutDate: date('check_out_date').notNull(),
  actualCheckIn: date('actual_check_in'),
  actualCheckOut: date('actual_check_out'),
  adults: integer('adults').notNull().default(1),
  children: integer('children').notNull().default(0),
  boardType: varchar('board_type', { length: 10 }).notNull(),
  roomRate: decimal('room_rate', { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  deposit: decimal('deposit', { precision: 12, scale: 2 }).default('0'),
  marketSegment: varchar('market_segment', { length: 30 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  checkInDateIdx: index('idx_bookings_check_in_date').on(table.checkInDate),
  checkOutDateIdx: index('idx_bookings_check_out_date').on(table.checkOutDate),
  statusIdx: index('idx_bookings_status').on(table.status),
  roomIdIdx: index('idx_bookings_room_id').on(table.roomId),
}));

module.exports = bookings;
