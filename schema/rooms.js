const { pgTable, uuid, varchar, integer, boolean, timestamp, index } = require('drizzle-orm/pg-core');

const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomNumber: varchar('room_number', { length: 10 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  floor: integer('floor').notNull(),
  bedType: varchar('bed_type', { length: 20 }).notNull(),
  maxOccupancy: integer('max_occupancy').notNull(),
  housekeepingStatus: varchar('housekeeping_status', { length: 30 }).notNull().default('propre'),
  blockReason: varchar('block_reason', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  isActiveIdx: index('idx_rooms_is_active').on(table.isActive),
}));

module.exports = rooms;
