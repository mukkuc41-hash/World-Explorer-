import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

// Define the 'users' table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'locations' table for saved locations/landmarks
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  continent: text('continent').notNull(),
  country: text('country').notNull(),
  state: text('state'),
  category: text('category').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'explorer_logs' table for tracking actions/achievements
export const explorerLogs = pgTable('explorer_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for the tables
export const usersRelations = relations(users, ({ many }) => ({
  locations: many(locations),
  logs: many(explorerLogs),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  user: one(users, {
    fields: [locations.userId],
    references: [users.id],
  }),
}));

export const explorerLogsRelations = relations(explorerLogs, ({ one }) => ({
  user: one(users, {
    fields: [explorerLogs.userId],
    references: [users.id],
  }),
}));
