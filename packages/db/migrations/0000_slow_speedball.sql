DO $$ BEGIN
 CREATE TYPE "role" AS ENUM('user', 'admin', 'superadmin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_status" AS ENUM('active', 'inactive');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ads_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar(20) NOT NULL,
	"name" varchar(255),
	"currency_code" varchar(3),
	"time_zone" varchar(50),
	"status" varchar(20) DEFAULT 'ACTIVE',
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ads_accounts_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_chart_points" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"customer_id" varchar(20) NOT NULL,
	"campaign_id" varchar(30) NOT NULL,
	"slot_ts" timestamp NOT NULL,
	"granularity" varchar(5) NOT NULL,
	"delta_cost_micros" numeric(20, 0) DEFAULT '0',
	"delta_conversions" integer DEFAULT 0,
	CONSTRAINT "campaign_chart_points_customer_id_campaign_id_slot_ts_granularity_unique" UNIQUE("customer_id","campaign_id","slot_ts","granularity")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ads_account_id" uuid,
	"name" varchar(255) NOT NULL,
	"action_type" varchar(30) NOT NULL,
	"execution_time" varchar(5) NOT NULL,
	"budget_value" numeric(14, 2),
	"budget_is_percentage" boolean DEFAULT false,
	"campaign_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(10) DEFAULT 'active',
	"last_executed_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns_snapshot" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"customer_id" varchar(20) NOT NULL,
	"campaign_id" varchar(30) NOT NULL,
	"date" date NOT NULL,
	"name" varchar(255),
	"status" varchar(20),
	"budget_micros" numeric(20, 0) DEFAULT '0',
	"cost_micros" numeric(20, 0) DEFAULT '0',
	"clicks" integer DEFAULT 0,
	"ctr_bps" integer DEFAULT 0,
	"avg_cpc_micros" numeric(20, 0) DEFAULT '0',
	"google_conversions" numeric(10, 2) DEFAULT '0',
	"google_conversion_value_micros" numeric(20, 0) DEFAULT '0',
	"real_conversions" integer DEFAULT 0,
	"real_conversions_pending" integer DEFAULT 0,
	"real_conversions_success" integer DEFAULT 0,
	"real_conversion_value_micros" numeric(20, 0) DEFAULT '0',
	"real_conversion_value_success_micros" numeric(20, 0) DEFAULT '0',
	"cf_cost_micros" numeric(20, 0) DEFAULT '0',
	"cf_conversions" integer DEFAULT 0,
	"cf_conversion_value_micros" numeric(20, 0) DEFAULT '0',
	"target_cpa_micros" numeric(20, 0),
	"target_roas_bps" integer,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "campaigns_snapshot_customer_id_campaign_id_date_unique" UNIQUE("customer_id","campaign_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ads_account_id" uuid,
	"provider" varchar(20) NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"config" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_integrations_ads_account_id_provider_unique" UNIQUE("ads_account_id","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"telegram_chat_id" varchar(30),
	"report_chat_id" varchar(30),
	"proxy" varchar(255),
	"use_proxy" boolean DEFAULT false,
	"report_enabled" boolean DEFAULT true,
	"report_frequency_minutes" integer DEFAULT 60,
	"report_hours_start" varchar(5) DEFAULT '06:00',
	"report_hours_end" varchar(5) DEFAULT '22:00',
	"report_days" jsonb,
	"last_report_sent_at" timestamp,
	"alert_enabled" boolean DEFAULT true,
	"alert_hours_start" varchar(5) DEFAULT '00:00',
	"alert_hours_end" varchar(5) DEFAULT '22:00',
	"report_template_id" uuid,
	"alert_template_id" uuid,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" varchar(10) NOT NULL,
	"content" text NOT NULL,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "optimization_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ads_account_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"target_type" varchar(30) NOT NULL,
	"target_value" jsonb,
	"schedule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_executed_at" timestamp,
	"executions_today_count" integer DEFAULT 0,
	"executions_today_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"shipping_fee" numeric(20, 0) DEFAULT '0',
	"import_price_micros" numeric(20, 0) DEFAULT '0',
	"selling_price_micros" numeric(20, 0) DEFAULT '0',
	"return_rate" numeric(5, 4) DEFAULT '0',
	"keyword_campaign" varchar(255),
	"ads_account_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "revenue_report_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"date" date NOT NULL,
	"ads_cost_micros" numeric(20, 0) DEFAULT '0',
	"orders" integer DEFAULT 0,
	"revenue_micros" numeric(20, 0) DEFAULT '0',
	"ship_cost_micros" numeric(20, 0) DEFAULT '0',
	"goods_cost_micros" numeric(20, 0) DEFAULT '0',
	"profit_micros" numeric(20, 0) DEFAULT '0',
	"is_locked" boolean DEFAULT false,
	CONSTRAINT "revenue_report_daily_report_id_date_unique" UNIQUE("report_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "revenue_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"product_id" uuid,
	"name" varchar(255) NOT NULL,
	"month" varchar(7) NOT NULL,
	"rates" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rule_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"action_order" integer DEFAULT 0,
	"action_type" varchar(40) NOT NULL,
	"action_value" numeric(20, 2),
	"alert_message" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rule_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"condition_group" integer DEFAULT 0,
	"metric" varchar(40) NOT NULL,
	"operator" varchar(10) NOT NULL,
	"value" numeric(20, 4) NOT NULL,
	"value_max" numeric(20, 4),
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rule_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rule_id" uuid,
	"rule_name" varchar(255),
	"ads_account_id" uuid,
	"customer_id" varchar(20),
	"campaign_id" varchar(30),
	"campaign_name" varchar(255),
	"action_type" varchar(40),
	"metrics_snapshot" jsonb,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rule_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(30) NOT NULL,
	"template_data" jsonb NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_ads_accounts" (
	"user_id" uuid NOT NULL,
	"ads_account_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0,
	"show_paused_by_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_ads_accounts_user_id_ads_account_id_pk" PRIMARY KEY("user_id","ads_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(30) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'user',
	"status" "user_status" DEFAULT 'active',
	"expire_at" timestamp,
	"mcc_id" varchar(20),
	"last_login_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chart_lookup" ON "campaign_chart_points" ("customer_id","campaign_id","granularity","slot_ts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_snapshot_customer_date" ON "campaigns_snapshot" ("customer_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rules_account_priority" ON "optimization_rules" ("ads_account_id","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rule_logs_account" ON "rule_logs" ("ads_account_id","executed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rule_logs_rule" ON "rule_logs" ("rule_id","executed_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_schedules" ADD CONSTRAINT "campaign_schedules_ads_account_id_ads_accounts_id_fk" FOREIGN KEY ("ads_account_id") REFERENCES "ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_integrations" ADD CONSTRAINT "crm_integrations_ads_account_id_ads_accounts_id_fk" FOREIGN KEY ("ads_account_id") REFERENCES "ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_tokens" ADD CONSTRAINT "google_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "optimization_rules" ADD CONSTRAINT "optimization_rules_ads_account_id_ads_accounts_id_fk" FOREIGN KEY ("ads_account_id") REFERENCES "ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_report_daily" ADD CONSTRAINT "revenue_report_daily_report_id_revenue_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "revenue_reports"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_reports" ADD CONSTRAINT "revenue_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "revenue_reports" ADD CONSTRAINT "revenue_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rule_actions" ADD CONSTRAINT "rule_actions_rule_id_optimization_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "optimization_rules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_rule_id_optimization_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "optimization_rules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_ads_accounts" ADD CONSTRAINT "user_ads_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_ads_accounts" ADD CONSTRAINT "user_ads_accounts_ads_account_id_ads_accounts_id_fk" FOREIGN KEY ("ads_account_id") REFERENCES "ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
