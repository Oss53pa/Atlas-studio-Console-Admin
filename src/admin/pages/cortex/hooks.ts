import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type {
  CpsApp, CpsArbitrationRow, CpsDashboard,
  CpsDeal, CpsMilestone, CpsAssumption, CpsCost,
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
  useEffect(() => { refresh(); }, [refresh]);
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
