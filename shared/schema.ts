import { pgTable, text, serial, integer, boolean, timestamp, decimal, primaryKey, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['manager', 'agent']);
export const leadStatusEnum = pgEnum('lead_status', ['pending', 'assigned', 'closed']);
export const settingTypeEnum = pgEnum('setting_type', ['email', 'notification', 'system']);

// Users table (managers and agents)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('agent'),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent Groups table
export const agentGroups = pgTable("agent_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agents to Groups relationship table
export const agentGroupMembers = pgTable("agent_group_members", {
  agentId: integer("agent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer("group_id").notNull().references(() => agentGroups.id, { onDelete: 'cascade' }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastAssignment: timestamp("last_assignment"),
}, (t) => ({
  pk: primaryKey(t.agentId, t.groupId),
}));

// Routing Rules table
export const routingRules = pgTable("routing_rules", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => agentGroups.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  minPrice: decimal("min_price", { precision: 12, scale: 2 }),
  maxPrice: decimal("max_price", { precision: 12, scale: 2 }),
  zipCodes: text("zip_codes").array(),
  addressPattern: text("address_pattern"),
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  price: decimal("price", { precision: 12, scale: 2 }),
  priceMax: decimal("price_max", { precision: 12, scale: 2 }),
  zipCode: text("zip_code"),
  address: text("address"),
  source: text("source"),
  status: leadStatusEnum("status").default('pending').notNull(),
  assignedAgentId: integer("assigned_agent_id").references(() => users.id),
  routingRuleId: integer("routing_rule_id").references(() => routingRules.id),
  originalEmail: text("original_email"),
  notes: text("notes"),
  propertyUrl: text("property_url"),
  thumbnailUrl: text("thumbnail_url"),
  movingDate: timestamp("moving_date"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  type: settingTypeEnum("type").default('system').notNull(),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Lead status history for tracking activities
export const leadStatusHistory = pgTable("lead_status_history", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }),
  agentId: integer("agent_id").references(() => users.id),
  status: leadStatusEnum("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  systemSettingsUpdates: many(systemSettings),
  assignedLeads: many(leads),
  statusUpdates: many(leadStatusHistory),
  groupMemberships: many(agentGroupMembers),
}));

export const agentGroupsRelations = relations(agentGroups, ({ many }) => ({
  members: many(agentGroupMembers),
  routingRules: many(routingRules),
}));

export const agentGroupMembersRelations = relations(agentGroupMembers, ({ one }) => ({
  agent: one(users, {
    fields: [agentGroupMembers.agentId],
    references: [users.id],
  }),
  group: one(agentGroups, {
    fields: [agentGroupMembers.groupId],
    references: [agentGroups.id],
  }),
}));

export const routingRulesRelations = relations(routingRules, ({ one }) => ({
  group: one(agentGroups, {
    fields: [routingRules.groupId],
    references: [agentGroups.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedAgent: one(users, {
    fields: [leads.assignedAgentId],
    references: [users.id],
  }),
  routingRule: one(routingRules, {
    fields: [leads.routingRuleId],
    references: [routingRules.id],
  }),
  statusHistory: many(leadStatusHistory),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

export const leadStatusHistoryRelations = relations(leadStatusHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [leadStatusHistory.leadId],
    references: [leads.id],
  }),
  agent: one(users, {
    fields: [leadStatusHistory.agentId],
    references: [users.id],
  }),
}));

// Validation schemas
export const userInsertSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
});

export const userLoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const agentGroupInsertSchema = createInsertSchema(agentGroups, {
  name: (schema) => schema.min(2, "Group name must be at least 2 characters"),
});

export const routingRuleInsertSchema = createInsertSchema(routingRules, {
  name: (schema) => schema.min(2, "Rule name must be at least 2 characters"),
  groupId: (schema) => schema.positive("Must specify a valid group"),
});

export const leadInsertSchema = createInsertSchema(leads, {
  name: (schema) => schema.min(2, "Lead name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
});

export const systemSettingsInsertSchema = createInsertSchema(systemSettings, {
  key: (schema) => schema.min(1, "Key must not be empty"),
});

export const emailSettingsSchema = z.object({
  emailUser: z.string().min(1, "Email username is required"),
  emailPassword: z.string().min(1, "Email password is required"),
  emailHost: z.string().default("imap.gmail.com"),
  emailPort: z.coerce.number().default(993),
  emailTls: z.boolean().default(true),
});

export const leadStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'assigned', 'closed']),
  notes: z.string().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type UserInsert = z.infer<typeof userInsertSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type SystemSettingInsert = z.infer<typeof systemSettingsInsertSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export type AgentGroup = typeof agentGroups.$inferSelect;
export type AgentGroupInsert = z.infer<typeof agentGroupInsertSchema>;

export type AgentGroupMember = typeof agentGroupMembers.$inferSelect;

export type RoutingRule = typeof routingRules.$inferSelect;
export type RoutingRuleInsert = z.infer<typeof routingRuleInsertSchema>;

export type Lead = typeof leads.$inferSelect;
export type LeadInsert = z.infer<typeof leadInsertSchema>;

export type LeadStatusHistory = typeof leadStatusHistory.$inferSelect;
export type LeadStatusUpdate = z.infer<typeof leadStatusUpdateSchema>;
