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

/** Snapshot KPI du dashboard (calculé côté Postgres — RG-07). */
export interface CpsDashboard {
  apps_total: number;
  apps_live: number;
  apps_build: number;
  apps_locomotive: number;
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
