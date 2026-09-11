import { pgTable, text, numeric, timestamp, uuid, boolean, varchar, integer, pgEnum, foreignKey, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "verified", "rejected"]);
export const billStatusEnum = pgEnum("bill_status", ["unpaid", "dp", "paid"]);
export const participantStatusEnum = pgEnum("participant_status", ["active", "cancelled"]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  status: userStatusEnum("status").default("active").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const userMemberships = pgTable(
  "user_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    tenant_id: uuid("tenant_id").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.user_id], foreignColumns: [users.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.tenant_id], foreignColumns: [tenants.id] }).onDelete("cascade"),
    unique("unique_user_tenant").on(table.user_id, table.tenant_id),
  ]
);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    departure_date: timestamp("departure_date"),
    timezone: varchar("timezone", { length: 50 }).default("Asia/Jakarta").notNull(),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    price_catalog_version: integer("price_catalog_version").default(1).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.tenant_id], foreignColumns: [tenants.id] }).onDelete("cascade"),
    index("idx_trips_tenant").on(table.tenant_id),
  ]
);

export const sourceConnections = pgTable(
  "source_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trip_id: uuid("trip_id").notNull(),
    spreadsheet_id: varchar("spreadsheet_id", { length: 255 }).notNull(),
    sheet_id: integer("sheet_id").notNull(),
    sheet_title: varchar("sheet_title", { length: 255 }).notNull(),
    mapping_version: integer("mapping_version").default(1).notNull(),
    mapping_config: text("mapping_config").notNull(),
    last_success_at: timestamp("last_success_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
    unique("unique_trip_source").on(table.trip_id, table.spreadsheet_id, table.sheet_id),
  ]
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source_connection_id: uuid("source_connection_id").notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    new_count: integer("new_count").default(0).notNull(),
    changed_count: integer("changed_count").default(0).notNull(),
    error_count: integer("error_count").default(0).notNull(),
    error_message: text("error_message"),
    started_at: timestamp("started_at").defaultNow().notNull(),
    completed_at: timestamp("completed_at"),
  },
  (table) => [
    foreignKey({ columns: [table.source_connection_id], foreignColumns: [sourceConnections.id] }).onDelete("cascade"),
  ]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trip_id: uuid("trip_id").notNull(),
    source_connection_id: uuid("source_connection_id").notNull(),
    source_row_number: integer("source_row_number").notNull(),
    raw_name: text("raw_name").notNull(),
    registered_at: timestamp("registered_at").notNull(),
    contact_phone: varchar("contact_phone", { length: 20 }),
    source_fingerprint: varchar("source_fingerprint", { length: 255 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.source_connection_id], foreignColumns: [sourceConnections.id] }).onDelete("cascade"),
    unique("unique_booking_source").on(table.source_connection_id, table.source_row_number),
    index("idx_bookings_trip").on(table.trip_id),
  ]
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    booking_id: uuid("booking_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    meeting_point: varchar("meeting_point", { length: 255 }),
    facility: varchar("facility", { length: 100 }).notNull(),
    status: participantStatusEnum("status").default("active").notNull(),
    cancellation_reason: text("cancellation_reason"),
    cancelled_at: timestamp("cancelled_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.booking_id], foreignColumns: [bookings.id] }).onDelete("cascade"),
    index("idx_participants_booking").on(table.booking_id),
  ]
);

export const priceCatalog = pgTable(
  "price_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trip_id: uuid("trip_id").notNull(),
    version: integer("version").notNull(),
    facility: varchar("facility", { length: 100 }).notNull(),
    base_price: numeric("base_price", { precision: 12, scale: 0 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
    unique("unique_facility_version").on(table.trip_id, table.version, table.facility),
  ]
);

export const addOns = pgTable(
  "add_ons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trip_id: uuid("trip_id").notNull(),
    version: integer("version").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    price_per_unit: numeric("price_per_unit", { precision: 12, scale: 0 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
    unique("unique_addon_version").on(table.trip_id, table.version, table.name),
  ]
);

export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participant_id: uuid("participant_id").notNull(),
    trip_id: uuid("trip_id").notNull(),
    base_amount: numeric("base_amount", { precision: 12, scale: 0 }).notNull(),
    adjustment: numeric("adjustment", { precision: 12, scale: 0 }).default("0").notNull(),
    total_amount: numeric("total_amount", { precision: 12, scale: 0 }).notNull(),
    price_version: integer("price_version").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.participant_id], foreignColumns: [participants.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
  ]
);

export const chargeLineItems = pgTable(
  "charge_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    charge_id: uuid("charge_id").notNull(),
    add_on_id: uuid("add_on_id").notNull(),
    quantity: integer("quantity").notNull(),
    unit_price: numeric("unit_price", { precision: 12, scale: 0 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.charge_id], foreignColumns: [charges.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.add_on_id], foreignColumns: [addOns.id] }).onDelete("cascade"),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    booking_id: uuid("booking_id").notNull(),
    trip_id: uuid("trip_id").notNull(),
    amount: numeric("amount", { precision: 12, scale: 0 }).notNull(),
    method: varchar("method", { length: 50 }).notNull(),
    paid_at: timestamp("paid_at").notNull(),
    date_source: varchar("date_source", { length: 50 }).default("manual").notNull(),
    status: paymentStatusEnum("status").default("pending").notNull(),
    verified_at: timestamp("verified_at"),
    verified_by: uuid("verified_by"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.booking_id], foreignColumns: [bookings.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.verified_by], foreignColumns: [users.id] }).onDelete("set null"),
  ]
);

export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payment_id: uuid("payment_id").notNull(),
    participant_id: uuid("participant_id").notNull(),
    allocated_amount: numeric("allocated_amount", { precision: 12, scale: 0 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.payment_id], foreignColumns: [payments.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.participant_id], foreignColumns: [participants.id] }).onDelete("cascade"),
  ]
);

export const evidences = pgTable(
  "evidences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payment_id: uuid("payment_id").notNull(),
    file_id: varchar("file_id", { length: 255 }).notNull(),
    file_name: varchar("file_name", { length: 255 }),
    content_hash: varchar("content_hash", { length: 255 }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.payment_id], foreignColumns: [payments.id] }).onDelete("cascade"),
  ]
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trip_id: uuid("trip_id"),
    tenant_id: uuid("tenant_id").notNull(),
    category_id: uuid("category_id").notNull(),
    amount: numeric("amount", { precision: 12, scale: 0 }).notNull(),
    occurred_at: timestamp("occurred_at").notNull(),
    description: varchar("description", { length: 500 }),
    created_by: uuid("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("set null"),
    foreignKey({ columns: [table.tenant_id], foreignColumns: [tenants.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.category_id], foreignColumns: [expenseCategories.id] }).onDelete("restrict"),
    foreignKey({ columns: [table.created_by], foreignColumns: [users.id] }).onDelete("restrict"),
  ]
);

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    active: boolean("active").default(true).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.tenant_id], foreignColumns: [tenants.id] }).onDelete("cascade"),
    unique("unique_category_name").on(table.tenant_id, table.name),
  ]
);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payment_id: uuid("payment_id").notNull(),
    participant_id: uuid("participant_id").notNull(),
    amount: numeric("amount", { precision: 12, scale: 0 }).notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    created_by: uuid("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.payment_id], foreignColumns: [payments.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.participant_id], foreignColumns: [participants.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.created_by], foreignColumns: [users.id] }).onDelete("restrict"),
  ]
);

export const cashEntries = pgTable(
  "cash_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trip_id: uuid("trip_id").notNull(),
    tenant_id: uuid("tenant_id").notNull(),
    source_type: varchar("source_type", { length: 50 }).notNull(),
    source_id: uuid("source_id"),
    direction: varchar("direction", { length: 10 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 0 }).notNull(),
    occurred_at: timestamp("occurred_at").notNull(),
    reversal_of_id: uuid("reversal_of_id"),
    created_by: uuid("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.tenant_id], foreignColumns: [tenants.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.created_by], foreignColumns: [users.id] }).onDelete("restrict"),
  ]
);

export const attendanceExports = pgTable(
  "attendance_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trip_id: uuid("trip_id").notNull(),
    version: integer("version").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    organizer_name: varchar("organizer_name", { length: 255 }),
    total_participants: integer("total_participants").notNull(),
    unpaid_count: integer("unpaid_count").notNull(),
    incomplete_count: integer("incomplete_count").notNull(),
    file_path: varchar("file_path", { length: 500 }).notNull(),
    created_by: uuid("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.trip_id], foreignColumns: [trips.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.created_by], foreignColumns: [users.id] }).onDelete("restrict"),
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id").notNull(),
    entity_type: varchar("entity_type", { length: 100 }).notNull(),
    entity_id: uuid("entity_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    old_values: text("old_values"),
    new_values: text("new_values"),
    reason: text("reason"),
    created_by: uuid("created_by").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.tenant_id], foreignColumns: [tenants.id] }).onDelete("cascade"),
    foreignKey({ columns: [table.created_by], foreignColumns: [users.id] }).onDelete("restrict"),
    index("idx_audit_entity").on(table.entity_type, table.entity_id),
  ]
);

export const tenantRelations = relations(tenants, ({ many }) => ({
  users: many(userMemberships),
  trips: many(trips),
}));

export const userRelations = relations(users, ({ many }) => ({
  memberships: many(userMemberships),
}));

export const userMembershipRelations = relations(userMemberships, ({ one }) => ({
  user: one(users, { fields: [userMemberships.user_id], references: [users.id] }),
  tenant: one(tenants, { fields: [userMemberships.tenant_id], references: [tenants.id] }),
}));

export const tripRelations = relations(trips, ({ many, one }) => ({
  bookings: many(bookings),
  sourceConnections: many(sourceConnections),
  expenses: many(expenses),
  cashEntries: many(cashEntries),
  tenant: one(tenants, { fields: [trips.tenant_id], references: [tenants.id] }),
}));

export const bookingRelations = relations(bookings, ({ many, one }) => ({
  participants: many(participants),
  payments: many(payments),
  trip: one(trips, { fields: [bookings.trip_id], references: [trips.id] }),
}));

export const participantRelations = relations(participants, ({ one, many }) => ({
  booking: one(bookings, { fields: [participants.booking_id], references: [bookings.id] }),
  charges: many(charges),
  allocations: many(paymentAllocations),
}));

export const paymentRelations = relations(payments, ({ many, one }) => ({
  allocations: many(paymentAllocations),
  evidences: many(evidences),
  booking: one(bookings, { fields: [payments.booking_id], references: [bookings.id] }),
}));
