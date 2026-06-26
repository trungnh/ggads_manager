import {
  pgTable,
  uuid,
  varchar,
  text,
  pgEnum,
  timestamp,
  integer,
  boolean,
  jsonb,
  bigserial,
  date,
  numeric,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Enums ---
export const roleEnum = pgEnum("role", ["user", "admin", "superadmin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);

// --- 3.1 users ---
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 30 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: roleEnum("role").default("user"),
  status: userStatusEnum("status").default("active"),
  expireAt: timestamp("expire_at"),
  mccId: varchar("mcc_id", { length: 20 }),
  lastLoginAt: timestamp("last_login_at"),
  isVerified: boolean("is_verified").default(false),
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  // Note: Self-reference cannot be done inline cleanly with Drizzle if it causes circular types,
  // but uuid('created_by') without .references() is safe for now, or using a foreign key constraint.
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// --- 3.2 oauthConnections ---
export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 20 }).notNull(), // 'google'
  email: varchar("email", { length: 255 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'INVALID'
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq: unique().on(t.userId, t.provider, t.email),
}));

// --- 3.3 adsAccounts ---
export const adsAccounts = pgTable("ads_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: varchar("customer_id", { length: 20 }).notNull().unique(),
  loginCustomerId: varchar("login_customer_id", { length: 20 }),
  name: varchar("name", { length: 255 }),
  currencyCode: varchar("currency_code", { length: 3 }),
  timeZone: varchar("time_zone", { length: 50 }),
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  oauthConnectionId: uuid("oauth_connection_id").references(() => oauthConnections.id, { onDelete: "set null" }),
  excludedCampaignIds: jsonb("excluded_campaign_ids").default([]),
  showOfflineOrders: boolean("show_offline_orders").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  placementsAutoExcludeEnabled: boolean("placements_auto_exclude_enabled").default(false),
  placementsAutoExcludeTime: varchar("placements_auto_exclude_time", { length: 5 }).default("08:00"),
  placementsAutoExcludeRange: varchar("placements_auto_exclude_range", { length: 20 }).default("YESTERDAY"),
  placementsProductContext: text("placements_product_context"),
  placementsAutoExcludeLastRun: date("placements_auto_exclude_last_run"),
  placementsCpaThreshold: integer("placements_cpa_threshold").default(250000),
  placementsScanFrequency: integer("placements_scan_frequency").default(15),
  healthAuditAutoEnabled: boolean("health_audit_auto_enabled").default(false),
  healthAuditCronFrequency: varchar("health_audit_cron_frequency", { length: 20 }).default("WEEKLY"),
  healthAuditLastRun: date("health_audit_last_run"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 3.4 userAdsAccounts ---
export const userAdsAccounts = pgTable("user_ads_accounts", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  adsAccountId: uuid("ads_account_id").references(() => adsAccounts.id, { onDelete: "cascade" }).notNull(),
  displayOrder: integer("display_order").default(0),
  showPausedByDefault: boolean("show_paused_by_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.adsAccountId] }),
}));

// --- 3.5 crmIntegrations (Links Ads Account to Order Sources)
export const crmIntegrations = pgTable("crm_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  adsAccountId: uuid("ads_account_id").references(() => adsAccounts.id, { onDelete: "cascade" }).notNull(),
  crmConnectionId: uuid("crm_connection_id").references(() => crmConnections.id, { onDelete: "cascade" }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq: unique().on(t.adsAccountId, t.crmConnectionId),
}));

// --- 3.6 campaignsSnapshot ---
export const campaignsSnapshot = pgTable("campaigns_snapshot", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: varchar("customer_id", { length: 20 }).notNull(),
  campaignId: varchar("campaign_id", { length: 30 }).notNull(),
  date: date("date").notNull(),
  name: varchar("name", { length: 255 }),
  status: varchar("status", { length: 20 }),
  biddingStrategyType: varchar("bidding_strategy_type", { length: 50 }),
  budgetMicros: numeric("budget_micros", { precision: 20, scale: 0 }).default("0"),
  costMicros: numeric("cost_micros", { precision: 20, scale: 0 }).default("0"),
  clicks: integer("clicks").default(0),
  ctrBps: integer("ctr_bps").default(0),
  avgCpcMicros: numeric("avg_cpc_micros", { precision: 20, scale: 0 }).default("0"),
  googleConversions: numeric("google_conversions", { precision: 10, scale: 2 }).default("0"),
  googleConversionValueMicros: numeric("google_conversion_value_micros", { precision: 20, scale: 0 }).default("0"),
  realConversions: integer("real_conversions").default(0),
  realConversionsPending: integer("real_conversions_pending").default(0),
  realConversionsSuccess: integer("real_conversions_success").default(0),
  realConversionValueMicros: numeric("real_conversion_value_micros", { precision: 20, scale: 0 }).default("0"),
  realConversionValueSuccessMicros: numeric("real_conversion_value_success_micros", { precision: 20, scale: 0 }).default("0"),
  cfCostMicros: numeric("cf_cost_micros", { precision: 20, scale: 0 }).default("0"),
  cfConversions: integer("cf_conversions").default(0),
  cfConversionValueMicros: numeric("cf_conversion_value_micros", { precision: 20, scale: 0 }).default("0"),
  targetCpaMicros: numeric("target_cpa_micros", { precision: 20, scale: 0 }),
  targetRoasBps: integer("target_roas_bps"),
  searchBudgetLostImpressionShare: numeric("search_budget_lost_impression_share", { precision: 5, scale: 4 }),
  searchRankLostImpressionShare: numeric("search_rank_lost_impression_share", { precision: 5, scale: 4 }),
  primaryStatus: varchar("primary_status", { length: 50 }).default("ELIGIBLE"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq: unique().on(t.customerId, t.campaignId, t.date),
  idx1: index("idx_snapshot_customer_date").on(t.customerId, t.date),
}));
// Note: Changed bigint mode: number to numeric for 20-digit micros precision in some cases 
// since JS max safe int is 9 quadrillion which is enough for 9M USD, but numeric is safer for huge VND micros.

// --- 3.7 campaignChartPoints ---
export const campaignChartPoints = pgTable("campaign_chart_points", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: varchar("customer_id", { length: 20 }).notNull(),
  campaignId: varchar("campaign_id", { length: 30 }).notNull(),
  slotTs: timestamp("slot_ts").notNull(),
  granularity: varchar("granularity", { length: 5 }).notNull(),
  deltaCostMicros: numeric("delta_cost_micros", { precision: 20, scale: 0 }).default("0"),
  deltaConversions: integer("delta_conversions").default(0),
}, (t) => ({
  uniq: unique().on(t.customerId, t.campaignId, t.slotTs, t.granularity),
  idx1: index("idx_chart_lookup").on(t.customerId, t.campaignId, t.granularity, t.slotTs),
}));

// --- telegramConnections ---
export const telegramConnections = pgTable("telegram_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  botToken: text("bot_token").notNull(),
  chatId: varchar("chat_id", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- telegramPerformanceReports ---
export const telegramPerformanceReports = pgTable("telegram_performance_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  connectionId: uuid("connection_id").references(() => telegramConnections.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  frequencyMinutes: integer("frequency_minutes").default(60), // 30, 60, 120, 240, 720, 1440
  hoursStart: varchar("hours_start", { length: 5 }).default("06:00"),
  hoursEnd: varchar("hours_end", { length: 5 }).default("22:00"),
  customMessage: text("custom_message"),
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.8 optimizationRules ---
export const optimizationRules = pgTable("optimization_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  adsAccountId: uuid("ads_account_id").references(() => adsAccounts.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  priority: integer("priority").default(0),
  targetType: varchar("target_type", { length: 30 }).notNull(),
  targetValue: jsonb("target_value"),
  schedule: jsonb("schedule").notNull().default({}),
  lastExecutedAt: timestamp("last_executed_at"),
  executionsTodayCount: integer("executions_today_count").default(0),
  executionsTodayDate: date("executions_today_date"),
  guardrailLearningProtection: boolean("guardrail_learning_protection").default(false),
  guardrail3xKill: boolean("guardrail_3x_kill").default(false),
  guardrailBudgetSuffocation: boolean("guardrail_budget_suffocation").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  idx1: index("idx_rules_account_priority").on(t.adsAccountId, t.priority),
}));

// --- 3.9 ruleConditions ---
export const ruleConditions = pgTable("rule_conditions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id").references(() => optimizationRules.id, { onDelete: "cascade" }),
  conditionGroup: integer("condition_group").default(0),
  metric: varchar("metric", { length: 40 }).notNull(),
  operator: varchar("operator", { length: 10 }).notNull(),
  value: numeric("value", { precision: 20, scale: 4 }).notNull(),
  valueMax: numeric("value_max", { precision: 20, scale: 4 }),
  sortOrder: integer("sort_order").default(0),
});

// --- 3.10 ruleActions ---
export const ruleActions = pgTable("rule_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id").references(() => optimizationRules.id, { onDelete: "cascade" }),
  actionOrder: integer("action_order").default(0),
  actionType: varchar("action_type", { length: 40 }).notNull(),
  actionValue: numeric("action_value", { precision: 20, scale: 2 }),
  alertMessage: text("alert_message"),
  telegramConnectionId: uuid("telegram_connection_id").references(() => telegramConnections.id, { onDelete: "set null" }),
});

// --- 3.11 ruleTemplates ---
export const ruleTemplates = pgTable("rule_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 30 }).notNull(),
  templateData: jsonb("template_data").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 3.12 ruleLogs ---
export const ruleLogs = pgTable("rule_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ruleId: uuid("rule_id"), // Nullable
  ruleName: varchar("rule_name", { length: 255 }),
  adsAccountId: uuid("ads_account_id"),
  customerId: varchar("customer_id", { length: 20 }),
  campaignId: varchar("campaign_id", { length: 30 }),
  campaignName: varchar("campaign_name", { length: 255 }),
  actionType: varchar("action_type", { length: 40 }),
  metricsSnapshot: jsonb("metrics_snapshot"),
  executedAt: timestamp("executed_at").defaultNow(),
}, (t) => ({
  idx1: index("idx_rule_logs_account").on(t.adsAccountId, t.executedAt),
  idx2: index("idx_rule_logs_rule").on(t.ruleId, t.executedAt),
}));

// --- 3.13 notificationSettings ---
export const notificationSettings = pgTable("notification_settings", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  telegramChatId: varchar("telegram_chat_id", { length: 30 }),
  reportChatId: varchar("report_chat_id", { length: 30 }),
  proxy: varchar("proxy", { length: 255 }),
  useProxy: boolean("use_proxy").default(false),
  reportEnabled: boolean("report_enabled").default(true),
  reportFrequencyMinutes: integer("report_frequency_minutes").default(60),
  reportHoursStart: varchar("report_hours_start", { length: 5 }).default("06:00"),
  reportHoursEnd: varchar("report_hours_end", { length: 5 }).default("22:00"),
  reportDays: jsonb("report_days"),
  lastReportSentAt: timestamp("last_report_sent_at"),
  alertEnabled: boolean("alert_enabled").default(true),
  alertHoursStart: varchar("alert_hours_start", { length: 5 }).default("00:00"),
  alertHoursEnd: varchar("alert_hours_end", { length: 5 }).default("22:00"),
  reportTemplateId: uuid("report_template_id"), // Cannot strictly reference notificationTemplates due to circular logic if not careful, keeping it simple.
  alertTemplateId: uuid("alert_template_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.14 notificationTemplates ---
export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = system
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  content: text("content").notNull(),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.15 campaignSchedules ---
export const campaignSchedules = pgTable("campaign_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  adsAccountId: uuid("ads_account_id").references(() => adsAccounts.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(),
  executionTime: varchar("execution_time", { length: 5 }).notNull(),
  budgetValue: numeric("budget_value", { precision: 14, scale: 2 }),
  budgetIsPercentage: boolean("budget_is_percentage").default(false),
  campaignIds: jsonb("campaign_ids").notNull().default([]),
  status: varchar("status", { length: 10 }).default("active"),
  lastExecutedDate: date("last_executed_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.16 products ---
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  shippingFee: numeric("shipping_fee", { precision: 20, scale: 0 }).default("0"),
  importPriceMicros: numeric("import_price_micros", { precision: 20, scale: 0 }).default("0"),
  sellingPriceMicros: numeric("selling_price_micros", { precision: 20, scale: 0 }).default("0"),
  returnRate: numeric("return_rate", { precision: 5, scale: 4 }).default("0"),
  keywordCampaign: varchar("keyword_campaign", { length: 255 }),
  adsAccountIds: jsonb("ads_account_ids").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.17 revenueReports & revenueReportDaily ---
export const revenueReports = pgTable("revenue_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  name: varchar("name", { length: 255 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  rates: jsonb("rates").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const revenueReportDaily = pgTable("revenue_report_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => revenueReports.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  adsCostMicros: numeric("ads_cost_micros", { precision: 20, scale: 0 }).default("0"),
  orders: integer("orders").default(0),
  quantity: integer("quantity").default(0),
  revenueMicros: numeric("revenue_micros", { precision: 20, scale: 0 }).default("0"),
  shipCostMicros: numeric("ship_cost_micros", { precision: 20, scale: 0 }).default("0"),
  goodsCostMicros: numeric("goods_cost_micros", { precision: 20, scale: 0 }).default("0"),
  profitMicros: numeric("profit_micros", { precision: 20, scale: 0 }).default("0"),
  isLocked: boolean("is_locked").default(false),
}, (t) => ({
  uniq: unique().on(t.reportId, t.date),
}));

export const campaignSettings = pgTable("campaign_settings", {
  customerId: varchar("customer_id", { length: 20 }).notNull(),
  campaignId: varchar("campaign_id", { length: 30 }).notNull(),
  isExcluded: boolean("is_excluded").default(false),
  lastConvCostMicros: numeric("last_conv_cost_micros", { precision: 20, scale: 0 }).default("0"),
  lastConvCount: integer("last_conv_count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  campaignSettingsPk: primaryKey({ columns: [t.customerId, t.campaignId] }),
}));

export const crmConnections = pgTable("crm_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  oauthConnectionId: uuid("oauth_connection_id").references(() => oauthConnections.id, { onDelete: "set null" }),
  pancakeAccountId: uuid("pancake_account_id").references(() => pancakeAccounts.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'google_sheet', 'pancake'
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pancakeAccounts = pgTable("pancake_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  shopId: varchar("shop_id", { length: 50 }).notNull(),
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.18 aiConnections ---
export const aiConnections = pgTable("ai_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'gemini', 'openai'
  apiKey: text("api_key").notNull(),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.19 placementExclusionLogs ---
export const placementExclusionLogs = pgTable("placement_exclusion_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adsAccountId: uuid("ads_account_id").references(() => adsAccounts.id, { onDelete: "cascade" }).notNull(),
  placementUrl: text("placement_url").notNull(),
  placementType: varchar("placement_type", { length: 50 }).notNull(), // 'YOUTUBE_CHANNEL', 'MOBILE_APP', 'WEBSITE'
  placementName: varchar("placement_name", { length: 255 }),
  costWasted: numeric("cost_wasted", { precision: 20, scale: 0 }).default("0"),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  aiCategory: varchar("ai_category", { length: 100 }),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'excluded', 'ignored'
  detectedAt: timestamp("detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// --- Relations ---

export const optimizationRulesRelations = relations(optimizationRules, ({ many }) => ({
  conditions: many(ruleConditions),
  actions: many(ruleActions),
  logs: many(ruleLogs),
}));

export const ruleConditionsRelations = relations(ruleConditions, ({ one }) => ({
  rule: one(optimizationRules, {
    fields: [ruleConditions.ruleId],
    references: [optimizationRules.id],
  }),
}));

export const ruleActionsRelations = relations(ruleActions, ({ one }) => ({
  rule: one(optimizationRules, {
    fields: [ruleActions.ruleId],
    references: [optimizationRules.id],
  }),
  telegramConnection: one(telegramConnections, {
    fields: [ruleActions.telegramConnectionId],
    references: [telegramConnections.id],
  }),
}));

export const ruleLogsRelations = relations(ruleLogs, ({ one }) => ({
  rule: one(optimizationRules, {
    fields: [ruleLogs.ruleId],
    references: [optimizationRules.id],
  }),
}));

export const pancakeAccountsRelations = relations(pancakeAccounts, ({ many }) => ({
  connections: many(crmConnections),
}));

export const crmConnectionsRelations = relations(crmConnections, ({ one }) => ({
  pancakeAccount: one(pancakeAccounts, {
    fields: [crmConnections.pancakeAccountId],
    references: [pancakeAccounts.id],
  }),
}));

export const telegramConnectionsRelations = relations(telegramConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [telegramConnections.userId],
    references: [users.id],
  }),
  reports: many(telegramPerformanceReports),
}));

export const telegramPerformanceReportsRelations = relations(telegramPerformanceReports, ({ one }) => ({
  user: one(users, {
    fields: [telegramPerformanceReports.userId],
    references: [users.id],
  }),
  connection: one(telegramConnections, {
    fields: [telegramPerformanceReports.connectionId],
    references: [telegramConnections.id],
  }),
}));

export const aiConnectionsRelations = relations(aiConnections, ({ one }) => ({
  user: one(users, {
    fields: [aiConnections.userId],
    references: [users.id],
  }),
}));

export const placementExclusionLogsRelations = relations(placementExclusionLogs, ({ one }) => ({
  adsAccount: one(adsAccounts, {
    fields: [placementExclusionLogs.adsAccountId],
    references: [adsAccounts.id],
  }),
}));

// --- 3.20 budgetOptimizations ---
export const budgetOptimizations = pgTable("budget_optimizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  adsAccountIds: jsonb("ads_account_ids").notNull().default([]), // Selected Ads Accounts
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'computing' | 'needs_explanation' | 'done' | 'error'
  
  optimizationInput: jsonb("optimization_input").notNull(), 
  /*
    Input Shape: {
      totalMonthlyBudget: number,
      remainingBudget: number,
      excludedStatuses: string[], 
      excludedTags: string[],     
      rolloutSteps: { day: number, percentage: number }[],
      safetyBreaker: {
        cpaThresholdPct: number,
        paceCheckEnabled: boolean,
        minSpendMicros: number
      }
    }
  */

  algorithmOutput: jsonb("algorithm_output"),
  aiExplanation: jsonb("ai_explanation"),
  
  // Staged rollout schedule day-by-day
  stagedRolloutSchedule: jsonb("staged_rollout_schedule"),
  /*
    Schedule Shape: [
      { dayIndex: number, date: string, budgetPct: number, status: 'applied' | 'pending' | 'failed' }
    ]
  */

  // Safety breaker triggers log
  safetyBreakerTriggeredAt: timestamp("safety_breaker_triggered_at"),
  safetyBreakerDetails: jsonb("safety_breaker_details"),

  appliedAt: timestamp("applied_at"),
  tokensUsed: integer("tokens_used"),
  computationMs: integer("computation_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- 3.21 budgetOptimizationSettings ---
export const budgetOptimizationSettings = pgTable("budget_optimization_settings", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  
  // Default values
  conversionSource: varchar("conversion_source", { length: 30 }).default("google_ads"), // 'google_ads' | 'pancake_crm' | 'pancake_pos'
  crmConversionStatus: varchar("crm_conversion_status", { length: 30 }).default("delivered"),
  safetyBreakerEnabled: boolean("safety_breaker_enabled").default(true),
  safetyBreakerCpaThresholdPct: integer("safety_breaker_cpa_threshold_pct").default(30),
  safetyBreakerMinConversions: integer("safety_breaker_min_conversions").default(3),
  stagedRolloutDays: integer("staged_rollout_days").default(3),
  crossAccountEnabled: boolean("cross_account_enabled").default(false),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Relations ---
export const budgetOptimizationsRelations = relations(budgetOptimizations, ({ one }) => ({
  user: one(users, {
    fields: [budgetOptimizations.userId],
    references: [users.id],
  }),
}));

export const budgetOptimizationSettingsRelations = relations(budgetOptimizationSettings, ({ one }) => ({
  user: one(users, {
    fields: [budgetOptimizationSettings.userId],
    references: [users.id],
  }),
}));

// --- 3.22 adsHealthAuditLogs ---
export const adsHealthAuditLogs = pgTable("ads_health_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adsAccountId: uuid("ads_account_id").references(() => adsAccounts.id, { onDelete: "cascade" }).notNull(),
  score: integer("score").notNull(),
  resultJson: jsonb("result_json").notNull(),
  triggerType: varchar("trigger_type", { length: 20 }).notNull(), // 'MANUAL' | 'AUTO'
  createdAt: timestamp("created_at").defaultNow(),
});

export const adsHealthAuditLogsRelations = relations(adsHealthAuditLogs, ({ one }) => ({
  adsAccount: one(adsAccounts, {
    fields: [adsHealthAuditLogs.adsAccountId],
    references: [adsAccounts.id],
  }),
}));


