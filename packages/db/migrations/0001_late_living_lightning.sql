CREATE TABLE IF NOT EXISTS "ads_health_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ads_account_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"result_json" jsonb NOT NULL,
	"trigger_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"api_key" text NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_optimization_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"conversion_source" varchar(30) DEFAULT 'google_ads',
	"crm_conversion_status" varchar(30) DEFAULT 'delivered',
	"safety_breaker_enabled" boolean DEFAULT true,
	"safety_breaker_cpa_threshold_pct" integer DEFAULT 30,
	"safety_breaker_min_conversions" integer DEFAULT 3,
	"staged_rollout_days" integer DEFAULT 3,
	"cross_account_enabled" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_optimizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ads_account_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"optimization_input" jsonb NOT NULL,
	"algorithm_output" jsonb,
	"ai_explanation" jsonb,
	"staged_rollout_schedule" jsonb,
	"safety_breaker_triggered_at" timestamp,
	"safety_breaker_details" jsonb,
	"applied_at" timestamp,
	"tokens_used" integer,
	"computation_ms" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_settings" (
	"customer_id" varchar(20) NOT NULL,
	"campaign_id" varchar(30) NOT NULL,
	"is_excluded" boolean DEFAULT false,
	"last_conv_cost_micros" numeric(20, 0) DEFAULT '0',
	"last_conv_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "campaign_settings_customer_id_campaign_id_pk" PRIMARY KEY("customer_id","campaign_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"oauth_connection_id" uuid,
	"pancake_account_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE',
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "oauth_connections_user_id_provider_email_unique" UNIQUE("user_id","provider","email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pancake_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"shop_id" varchar(50) NOT NULL,
	"api_key" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "placement_exclusion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ads_account_id" uuid NOT NULL,
	"placement_url" text NOT NULL,
	"placement_type" varchar(50) NOT NULL,
	"placement_name" varchar(255),
	"cost_wasted" numeric(20, 0) DEFAULT '0',
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"ai_category" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"detected_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"bot_token" text NOT NULL,
	"chat_id" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "telegram_performance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"frequency_minutes" integer DEFAULT 60,
	"hours_start" varchar(5) DEFAULT '06:00',
	"hours_end" varchar(5) DEFAULT '22:00',
	"custom_message" text,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "google_tokens";--> statement-breakpoint
ALTER TABLE "crm_integrations" DROP CONSTRAINT "crm_integrations_ads_account_id_provider_unique";--> statement-breakpoint
ALTER TABLE "crm_integrations" ALTER COLUMN "ads_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_integrations" ALTER COLUMN "is_enabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "login_customer_id" varchar(20);--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "oauth_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "excluded_campaign_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "show_offline_orders" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "placements_auto_exclude_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "placements_auto_exclude_time" varchar(5) DEFAULT '08:00';--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "placements_auto_exclude_range" varchar(20) DEFAULT 'YESTERDAY';--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "placements_product_context" text;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "placements_auto_exclude_last_run" date;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "placements_cpa_threshold" integer DEFAULT 250000;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "placements_scan_frequency" integer DEFAULT 15;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "health_audit_auto_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "health_audit_cron_frequency" varchar(20) DEFAULT 'WEEKLY';--> statement-breakpoint
ALTER TABLE "ads_accounts" ADD COLUMN "health_audit_last_run" date;--> statement-breakpoint
ALTER TABLE "campaigns_snapshot" ADD COLUMN "bidding_strategy_type" varchar(50);--> statement-breakpoint
ALTER TABLE "campaigns_snapshot" ADD COLUMN "search_budget_lost_impression_share" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "campaigns_snapshot" ADD COLUMN "search_rank_lost_impression_share" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "campaigns_snapshot" ADD COLUMN "primary_status" varchar(50) DEFAULT 'ELIGIBLE';--> statement-breakpoint
ALTER TABLE "crm_integrations" ADD COLUMN "crm_connection_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_integrations" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "optimization_rules" ADD COLUMN "guardrail_learning_protection" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "optimization_rules" ADD COLUMN "guardrail_3x_kill" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "optimization_rules" ADD COLUMN "guardrail_budget_suffocation" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "revenue_report_daily" ADD COLUMN "quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rule_actions" ADD COLUMN "telegram_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token_expires_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ads_accounts" ADD CONSTRAINT "ads_accounts_oauth_connection_id_oauth_connections_id_fk" FOREIGN KEY ("oauth_connection_id") REFERENCES "oauth_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_integrations" ADD CONSTRAINT "crm_integrations_crm_connection_id_crm_connections_id_fk" FOREIGN KEY ("crm_connection_id") REFERENCES "crm_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rule_actions" ADD CONSTRAINT "rule_actions_telegram_connection_id_telegram_connections_id_fk" FOREIGN KEY ("telegram_connection_id") REFERENCES "telegram_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "crm_integrations" DROP COLUMN IF EXISTS "provider";--> statement-breakpoint
ALTER TABLE "crm_integrations" DROP COLUMN IF EXISTS "config";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ads_health_audit_logs" ADD CONSTRAINT "ads_health_audit_logs_ads_account_id_ads_accounts_id_fk" FOREIGN KEY ("ads_account_id") REFERENCES "ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_optimization_settings" ADD CONSTRAINT "budget_optimization_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budget_optimizations" ADD CONSTRAINT "budget_optimizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_oauth_connection_id_oauth_connections_id_fk" FOREIGN KEY ("oauth_connection_id") REFERENCES "oauth_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_pancake_account_id_pancake_accounts_id_fk" FOREIGN KEY ("pancake_account_id") REFERENCES "pancake_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pancake_accounts" ADD CONSTRAINT "pancake_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "placement_exclusion_logs" ADD CONSTRAINT "placement_exclusion_logs_ads_account_id_ads_accounts_id_fk" FOREIGN KEY ("ads_account_id") REFERENCES "ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_connections" ADD CONSTRAINT "telegram_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_performance_reports" ADD CONSTRAINT "telegram_performance_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_performance_reports" ADD CONSTRAINT "telegram_performance_reports_connection_id_telegram_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "telegram_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "crm_integrations" ADD CONSTRAINT "crm_integrations_ads_account_id_crm_connection_id_unique" UNIQUE("ads_account_id","crm_connection_id");