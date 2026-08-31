import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const people = mysqlTable("people", {
  id: varchar("id", { length: 64 }).primaryKey(),
  firstName: text("first_name").notNull(),
  color: varchar("color", { length: 16 }).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = mysqlTable(
  "bookings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    personId: varchar("person_id", { length: 64 })
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    paymentSettled: boolean("payment_settled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("bookings_start_idx").on(t.startDate),
    index("bookings_person_idx").on(t.personId),
    check("bookings_valid_date_range", sql`${t.startDate} <= ${t.endDate}`),
  ],
);

export const photos = mysqlTable(
  "photos",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    bookingId: varchar("booking_id", { length: 64 })
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    uploaderId: varchar("uploader_id", { length: 64 })
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    photoDate: date("photo_date", { mode: "string" }).notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    caption: text("caption"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("photos_booking_idx").on(t.bookingId),
    index("photos_uploader_idx").on(t.uploaderId),
    index("photos_date_idx").on(t.photoDate),
  ],
);

export type PersonRow = typeof people.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
