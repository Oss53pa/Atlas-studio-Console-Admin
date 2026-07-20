// Cortex — types (miroir des tables cps_ de la Vague 1).

export type LifecycleStage = "idea" | "cdc" | "build" | "beta" | "live" | "frozen" | "sunset";
export type StrategicClass = "locomotive" | "pari" | "support" | "dormant";
export type CostCategory = "infra" | "ai_tooling" | "marketing" | "legal" | "hardware" | "financement" | "other";
export type Provenance = "manual" | "import" | "connector";
export type DealStage = "contact" | "demo" | "pilote" | "negociation" | "client" | "perdu";
export type DealOrigin = "reseau_perso" | "cosmos_terrain" | "inbound" | "partenaire" | "autre";
export type MilestoneCategory = "juridique" | "produit" | "commercial" | "financier" | "equipe";
export type MilestoneStatus = "a_venir" | "en_cours" | "atteint" | "glisse" | "abandonne";
export type AssumptionDomain = "pricing" | "demande" | "canal" | "cout" | "reglementaire" | "tech";
export type Criticality = "bloquante" | "majeure" | "mineure";
export type AssumptionStatus = "a_tester" | "en_test" | "validee" | "invalidee";

export interface CpsApp {
  id: string;
  code: string;
  name: string;
  lifecycle_stage: LifecycleStage;
  strategic_class: StrategicClass;
  priority_rank: number | null;
  target_market: string[];
  cosmos_leverage: boolean;
  cj_project_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CpsCost {
  id: string;
  category: CostCategory;
  label: string | null;
  amount_fcfa: number;
  period_month: string; // date (YYYY-MM-01)
  app_id: string | null;
  source: Provenance;
  owner_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface CpsDeal {
  id: string;
  app_id: string | null;
  prospect_name: string;
  segment: string | null;
  stage: DealStage;
  expected_mrr_fcfa: number;
  probability_bp: number;
  origin: DealOrigin;
  next_action: string | null;
  next_action_date: string | null;
  source: Provenance;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface CpsMilestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  target_date: string | null;
  status: MilestoneStatus;
  app_id: string | null;
  success_criteria: string | null;
  cj_task_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface CpsAssumption {
  id: string;
  statement: string;
  app_id: string | null;
  domain: AssumptionDomain;
  criticality: Criticality;
  status: AssumptionStatus;
  test_method: string | null;
  evidence: unknown[];
  linked_projections: boolean;
  created_at: string;
  updated_at: string;
}

/* ── Vague 2 : Finance & scénarios ──────────────────────────────────────── */
export type PricingModel = "subscription" | "freemium" | "setup_fee" | "usage" | "license" | "service";
export type PricingPeriod = "monthly" | "quarterly" | "yearly" | "one_off";
export type PricingStatus = "draft" | "active" | "retired";
export type ScenarioKind = "pessimiste" | "realiste" | "optimiste" | "custom";
export type ChannelStatus = "a_tester" | "actif" | "abandonne";

export interface CpsPricingPlan {
  id: string; app_id: string; plan_code: string; model: PricingModel;
  amount_fcfa: number; period: PricingPeriod; status: PricingStatus;
  created_at: string; updated_at: string;
}

export interface CpsScenario {
  id: string; name: string; kind: ScenarioKind; app_id: string | null;
  horizon_months: number;
  start_customers: number; new_per_month: number; growth_bp: number;
  churn_monthly_bp: number; avg_mrr_fcfa: number; monthly_fixed_cost_fcfa: number;
  linked_assumption_ids: string[]; inputs_hash: string | null; is_stale: boolean;
  created_at: string; updated_at: string;
}

export interface CpsProjection {
  id: string; scenario_id: string; app_id: string | null; month_index: number;
  mrr_fcfa: number; new_customers: number; active_customers: number;
  churn_rate_bp: number; costs_fcfa: number; computed_at: string; inputs_hash: string;
}

export interface CpsChannel {
  id: string; app_id: string; name: string; status: ChannelStatus;
  cost_fcfa: number; results: string | null; created_at: string; updated_at: string;
}

/* ── Vague 3 : Data Fabric ──────────────────────────────────────────────── */
export type SourceMode = "push" | "pull" | "manual";
export type SourceStatus = "active" | "paused";

export interface CpsDataSource {
  id: string; source_app: string; mode: SourceMode; hmac_secret: string | null;
  status: SourceStatus; last_seen_at: string | null;
  event_count: number; reject_count: number; last_reject_reason: string | null;
  created_at: string; updated_at: string;
}

export interface CpsEventRaw {
  id: string; source_app: string; event_type: string; occurred_at: string;
  payload: Record<string, unknown>; idempotency_key: string; received_at: string;
}

export interface CpsMetricsSnapshot {
  id: string; app_code: string; app_id: string | null;
  mrr_fcfa: number; active_clients: number; trials: number; signups: number; updated_at: string;
}

/* ── Vague 4 : PROPH3T Cortex Advisor ───────────────────────────────────── */
export type InsightType = "alerte_derive" | "opportunite" | "arbitrage_portefeuille" | "hypothese_suggeree" | "risque" | "synthese_periodique";
export type InsightSeverity = "info" | "attention" | "critique";
export type InsightStatus = "nouveau" | "lu" | "accepte" | "rejete" | "converti_en_action";

export interface CpsInsight {
  id: string; insight_type: InsightType; severity: InsightSeverity;
  title: string; body: string; scope: Record<string, unknown>;
  inputs_hash: string | null; model_used: string | null;
  status: InsightStatus; human_note: string | null; cj_task_created: string | null;
  created_at: string; updated_at: string;
}

/* ── Vague 5 : Canvas & business plan ───────────────────────────────────── */
export type BlockType =
  | "segments" | "value_prop" | "channels" | "relations"
  | "revenues" | "resources" | "activities" | "partners" | "costs";
export type Confidence = "hypothese" | "testee" | "validee";
/** Profils d'export du business plan (RG-11 : whitelist de champs par profil). */
export type BpProfile = "complet" | "banquier" | "partenaire";

export interface CanvasItem {
  label: string;
  detail?: string;
  confidence?: Confidence;
  linked_assumption_id?: string | null;
}

export interface CpsCanvas {
  id: string; app_id: string | null; version: number; label: string | null;
  created_at: string; updated_at: string;
}

export interface CpsCanvasBlock {
  id: string; canvas_id: string; block_type: BlockType;
  items: CanvasItem[]; updated_at: string;
}

/** Snapshot KPI du dashboard (calculé côté Postgres — RG-07). */
export interface CpsDashboard {
  apps_total: number;
  apps_live: number;
  apps_build: number;
  apps_locomotive: number;
  mrr_real_fcfa: number;
  active_clients: number;
  pipeline_weighted_fcfa: number;
  pipeline_open_deals: number;
  milestones_due_30d: number;
  assumptions_critical_open: number;
  costs_month_fcfa: number;
}

/** Ligne d'arbitrage (app + agrégats). */
export interface CpsArbitrationRow extends CpsApp {
  open_deals: number;
  pipeline_weighted_fcfa: number;
  open_critical_assumptions: number;
}
