import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type {
  CpsApp, CpsArbitrationRow, CpsDashboard,
  CpsDeal, CpsMilestone, CpsAssumption, CpsCost,
  CpsPricingPlan, CpsScenario, CpsProjection, CpsChannel,
  CpsDataSource, CpsEventRaw, CpsInsight, InsightStatus,
} from "./types";

/* ── Dashboard exécutif (agrégats serveur, RG-07) ───────────────────────── */
export function useCortexDashboard() {
  const [data, setData] = useState<CpsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("cps_dashboard");
    if (error) setError(error.message);
    else { setData(data as CpsDashboard); setError(null); }
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    // Temps réel (Vague 3) : le snapshot change → on rafraîchit les tuiles.
    const ch = supabase.channel("cortex:dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "cps_metrics_snapshot" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);
  return { data, loading, error, refresh };
}

/* ── Portefeuille : table d'arbitrage + CRUD apps ───────────────────────── */
export function useCortexPortfolio() {
  const [rows, setRows] = useState<CpsArbitrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("cps_arbitration");
    if (error) setError(error.message);
    else { setRows((data ?? []) as CpsArbitrationRow[]); setError(null); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const createApp = useCallback(async (input: Partial<CpsApp>) => {
    const { error } = await supabase.from("cps_apps").insert(input);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const updateApp = useCallback(async (id: string, patch: Partial<CpsApp>) => {
    const { error } = await supabase.from("cps_apps").update(patch).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const deleteApp = useCallback(async (id: string) => {
    const { error } = await supabase.from("cps_apps").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  /** Reclasse une app (stade / classe / rang) + historise (cps_app_stage_history). */
  const reclassApp = useCallback(async (
    app: CpsApp, field: "lifecycle_stage" | "strategic_class" | "priority_rank",
    newValue: string | number | null, reason?: string,
  ) => {
    const old = (app as any)[field];
    const { error } = await supabase.from("cps_apps").update({ [field]: newValue }).eq("id", app.id);
    if (error) throw error;
    await supabase.from("cps_app_stage_history").insert({
      app_id: app.id, field_changed: field,
      old_value: old == null ? null : String(old),
      new_value: newValue == null ? null : String(newValue),
      reason: reason ?? null,
    });
    await refresh();
  }, [refresh]);

  return { rows, loading, error, refresh, createApp, updateApp, deleteApp, reclassApp };
}

/* ── Générique : liste + CRUD sur une table cps_ (filtrable par app) ─────── */
function useCpsTable<T extends { id: string }>(
  table: string, orderBy: string, ascending: boolean, appId?: string,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from(table).select("*").order(orderBy, { ascending });
    if (appId) q = q.eq("app_id", appId);
    const { data, error } = await q;
    if (error) setError(error.message);
    else { setRows((data ?? []) as T[]); setError(null); }
    setLoading(false);
  }, [table, orderBy, ascending, appId]);
  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: Partial<T>) => {
    const { error } = await supabase.from(table).insert(input);
    if (error) throw error;
    await refresh();
  }, [table, refresh]);

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [table, refresh]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }, [table, refresh]);

  return { rows, loading, error, refresh, create, update, remove };
}

export const useCortexDeals = (appId?: string) =>
  useCpsTable<CpsDeal>("cps_deals", "last_activity_at", false, appId);
export const useCortexMilestones = (appId?: string) =>
  useCpsTable<CpsMilestone>("cps_milestones", "target_date", true, appId);
export const useCortexAssumptions = (appId?: string) =>
  useCpsTable<CpsAssumption>("cps_assumptions", "created_at", false, appId);
export const useCortexCosts = (appId?: string) =>
  useCpsTable<CpsCost>("cps_costs", "period_month", false, appId);

/* ── Vague 2 : Finance & scénarios ──────────────────────────────────────── */
export const useCortexPricing = (appId?: string) =>
  useCpsTable<CpsPricingPlan>("cps_pricing_plans", "created_at", false, appId);
export const useCortexChannels = (appId?: string) =>
  useCpsTable<CpsChannel>("cps_channels", "created_at", false, appId);

export function useCortexScenarios(appId?: string) {
  const base = useCpsTable<CpsScenario>("cps_scenarios", "created_at", false, appId);
  const generate = useCallback(async (scenarioId: string) => {
    const { data, error } = await supabase.rpc("cps_generate_projections", { p_scenario: scenarioId });
    if (error) throw error;
    await base.refresh();
    return data as number;
  }, [base]);
  return { ...base, generate };
}

export function useCortexProjections(scenarioId?: string) {
  const [rows, setRows] = useState<CpsProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!scenarioId) { setRows([]); return; }
    setLoading(true);
    const { data } = await supabase.from("cps_projections").select("*").eq("scenario_id", scenarioId).order("month_index");
    setRows((data ?? []) as CpsProjection[]);
    setLoading(false);
  }, [scenarioId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { rows, loading, refresh };
}

/* ── Vague 3 : Data Fabric ──────────────────────────────────────────────── */
function randomSecret(): string {
  const a = new Uint8Array(24);
  (globalThis.crypto || (window as any).crypto).getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useCortexDataSources() {
  const base = useCpsTable<CpsDataSource>("cps_data_sources", "created_at", false);
  const createSource = useCallback(async (source_app: string, mode: string) => {
    const { error } = await supabase.from("cps_data_sources")
      .insert({ source_app, mode, hmac_secret: randomSecret(), status: "active" });
    if (error) throw error;
    await base.refresh();
  }, [base]);
  const rotateSecret = useCallback(async (id: string) => {
    const { error } = await supabase.from("cps_data_sources").update({ hmac_secret: randomSecret() }).eq("id", id);
    if (error) throw error;
    await base.refresh();
  }, [base]);
  return { ...base, createSource, rotateSecret };
}

export function useCortexEvents(limit = 40) {
  const [rows, setRows] = useState<CpsEventRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("cps_events_raw").select("*").order("received_at", { ascending: false }).limit(limit);
    setRows((data ?? []) as CpsEventRaw[]);
    setLoading(false);
  }, [limit]);
  useEffect(() => { refresh(); }, [refresh]);
  return { rows, loading, refresh };
}

/* ── Vague 4 : PROPH3T Cortex Advisor ───────────────────────────────────── */
export function useCortexInsights() {
  const [rows, setRows] = useState<CpsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cps_proph3t_insights")
      .select("*").order("created_at", { ascending: false }).limit(100);
    if (error) setError(error.message);
    else { setRows((data ?? []) as CpsInsight[]); setError(null); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  /** Triage humain (RG-08 : validation obligatoire). */
  const triage = useCallback(async (id: string, status: InsightStatus, human_note?: string) => {
    const patch: Record<string, unknown> = { status };
    if (human_note !== undefined) patch.human_note = human_note;
    const { error } = await supabase.from("cps_proph3t_insights").update(patch).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  /** Détection déterministe (sans IA) — RPC serveur. */
  const detectSignals = useCallback(async () => {
    const { data, error } = await supabase.rpc("cps_detect_signals");
    if (error) throw error;
    await refresh();
    return data as number;
  }, [refresh]);

  /** Analyse IA (Edge Function cortex-advisor-feed — nécessite déploiement). */
  const runAdvisor = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("cortex-advisor-feed", {
      body: {},
      headers: s?.session ? { Authorization: `Bearer ${s.session.access_token}` } : undefined,
    });
    if (error) throw error;
    await refresh();
    return data as { inserted: number; rejected_count: number };
  }, [refresh]);

  return { rows, loading, error, refresh, triage, detectSignals, runAdvisor };
}

/** Une seule app (fiche) via la table d'arbitrage. */
export function useCortexApp(appId: string) {
  const [app, setApp] = useState<CpsArbitrationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("cps_arbitration");
    setApp(((data ?? []) as CpsArbitrationRow[]).find((r) => r.id === appId) ?? null);
    setLoading(false);
  }, [appId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { app, loading, refresh };
}
