"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  api,
  ADMIN_ROLES,
  Profile,
  Role,
  FinanceResponse,
  PoultryBatchRow,
  EggRecordRow,
  IncubationRow,
  PoultryHealthRow,
  VegetableUnitRow,
  VegetableHealthRow,
  RabbitRow,
  RabbitPairingRow,
  DogRow,
  DogHeatRow,
  InputsResponse,
  InputPurchaseRow,
  InputUsageRow,
  SaleRow,
  EggStock,
  BatchVaccinationRow,
} from "@/lib/api-client";
import { createClientSupabase } from "@/lib/supabase/client";

// ---------- Profile (current user + role) ----------
// Queried directly against Supabase (RLS-protected: a user always sees their own
// row) rather than through an Edge Function — there's no domain logic here, just
// "who am I", so a function hop would be pure overhead.
export function useProfile() {
  const query = useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const supabase = createClientSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", auth.user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    staleTime: 5 * 60_000,
  });

  const isAdmin = !!query.data && ADMIN_ROLES.includes(query.data.role);
  return { ...query, isAdmin };
}

// ---------- Queries ----------
export function useFinance(archived = false) {
  return useQuery<FinanceResponse>({
    queryKey: ["finance", { archived }],
    queryFn: () => api.get<FinanceResponse>("finance", archived ? { archived: "true" } : undefined),
  });
}

export function usePoultryBatches(archived = false) {
  return useQuery<PoultryBatchRow[]>({
    queryKey: ["poultry", { archived }],
    queryFn: () => api.get<PoultryBatchRow[]>("poultry", archived ? { archived: "true" } : undefined),
  });
}

export function useEggRecords(archived = false) {
  return useQuery<EggRecordRow[]>({
    queryKey: ["eggs", { archived }],
    queryFn: () => api.get<EggRecordRow[]>("eggs", archived ? { archived: "true" } : undefined),
  });
}

export function useIncubations(archived = false) {
  return useQuery<IncubationRow[]>({
    queryKey: ["incubations", { archived }],
    queryFn: () => api.get<IncubationRow[]>("incubations", archived ? { archived: "true" } : undefined),
  });
}

export function usePoultryHealth(archived = false) {
  return useQuery<PoultryHealthRow[]>({
    queryKey: ["poultry-health", { archived }],
    queryFn: () => api.get<PoultryHealthRow[]>("poultry-health", archived ? { archived: "true" } : undefined),
  });
}

export function useVegetableUnits(archived = false) {
  return useQuery<VegetableUnitRow[]>({
    queryKey: ["vegetables", { archived }],
    queryFn: () => api.get<VegetableUnitRow[]>("vegetables", archived ? { archived: "true" } : undefined),
  });
}

export function useVegetableHealth(archived = false) {
  return useQuery<VegetableHealthRow[]>({
    queryKey: ["vegetable-health", { archived }],
    queryFn: () => api.get<VegetableHealthRow[]>("vegetable-health", archived ? { archived: "true" } : undefined),
  });
}

export function useRabbits(archived = false) {
  return useQuery<RabbitRow[]>({
    queryKey: ["rabbits", { archived }],
    queryFn: () => api.get<RabbitRow[]>("rabbits", archived ? { archived: "true" } : undefined),
  });
}

export function useRabbitPairings(archived = false) {
  return useQuery<RabbitPairingRow[]>({
    queryKey: ["rabbit-pairings", { archived }],
    queryFn: () => api.get<RabbitPairingRow[]>("rabbit-pairings", archived ? { archived: "true" } : undefined),
  });
}

export function useDogs(archived = false) {
  return useQuery<DogRow[]>({
    queryKey: ["dogs", { archived }],
    queryFn: () => api.get<DogRow[]>("dogs", archived ? { archived: "true" } : undefined),
  });
}

export function useDogHeats(archived = false) {
  return useQuery<DogHeatRow[]>({
    queryKey: ["dog-heats", { archived }],
    queryFn: () => api.get<DogHeatRow[]>("dog-heats", archived ? { archived: "true" } : undefined),
  });
}

// ---------- Inputs & Stock ----------
// One query serves the catalog, the computed stock balances and the supplier
// history — the purchase modal needs all three to prefill itself.
export function useInputs(archived = false) {
  return useQuery<InputsResponse>({
    queryKey: ["inputs", { archived }],
    queryFn: () => api.get<InputsResponse>("inputs", archived ? { archived: "true" } : undefined),
  });
}

export function useInputPurchases(archived = false) {
  return useQuery<InputPurchaseRow[]>({
    queryKey: ["input-purchases", { archived }],
    queryFn: () =>
      api.get<InputPurchaseRow[]>("input-purchases", archived ? { archived: "true" } : undefined),
  });
}

export function useInputUsage(archived = false) {
  return useQuery<InputUsageRow[]>({
    queryKey: ["input-usage", { archived }],
    queryFn: () => api.get<InputUsageRow[]>("input-usage", archived ? { archived: "true" } : undefined),
  });
}

// ---------- Sales ----------
// Sales are *created* through the finance endpoint (a sale is the revenue entry
// — record_sale writes both). This lists the stock-out side of that ledger.
export function useSales(archived = false) {
  return useQuery<SaleRow[]>({
    queryKey: ["sales", { archived }],
    queryFn: () => api.get<SaleRow[]>("sales", archived ? { archived: "true" } : undefined),
  });
}

// Eggs are fungible and farm-wide, so their balance is one row rather than a
// per-batch column — read straight from the RLS-protected view, like useProfile:
// there is no domain logic here, so an Edge Function hop would be pure overhead.
export function useEggStock() {
  return useQuery<EggStock | null>({
    queryKey: ["egg-stock"],
    queryFn: async () => {
      const supabase = createClientSupabase();
      const { data, error } = await supabase.from("egg_stock").select("*").maybeSingle();
      if (error) throw error;
      return (data as EggStock) ?? null;
    },
  });
}

// ---------- Mutations ----------

// Generic create mutation that invalidates the given query key (all archived
// variants included, since a new record always lands in the live/active view).
//
// `alsoInvalidate` covers writes with server-side side-effects on other
// entities: deploying a batch or a unit also writes the purchase EXPENSE row, so
// the finance cache is stale the moment the deploy succeeds. Without this the
// row lands in the DB but the P&L keeps serving its cached totals until a reload.
export function useCreate<T = unknown>(key: string, url: string, alsoInvalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post<T>(url, data),
    onSuccess: () => {
      for (const k of [key, ...alsoInvalidate]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
    },
  });
}

// Admin-only archive (never a hard delete — see Edge Function + RLS). Invalidates
// both the live and archived views of this entity.
//
// `alsoInvalidate` mirrors useCreate: archiving an input purchase archives its
// paired EXPENSE too and changes the stock balance, so the finance and inputs
// caches are stale the moment it succeeds.
export function useArchive(key: string, url: string, alsoInvalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archive(url, id),
    onSuccess: () => {
      for (const k of [key, ...alsoInvalidate]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
    },
  });
}

// ---------- Vaccinations ----------
// Read/written straight through PostgREST (like useProfile/useEggStock): there
// is no domain logic — RLS scopes every row to the farm, and the unique
// (farm_id, batch_id, sched_day) index rejects a double-recorded dose.
export function useBatchVaccinations() {
  return useQuery<BatchVaccinationRow[]>({
    queryKey: ["batch-vaccinations"],
    queryFn: async () => {
      const supabase = createClientSupabase();
      const { data, error } = await supabase
        .from("batch_vaccinations")
        .select("*")
        .order("given_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BatchVaccinationRow[];
    },
  });
}

// Records one administered dose. No invalidation of anything beyond its own
// key today, but "batch-vaccinations" is what the dashboard alert engine reads,
// so keeping the key name stable matters.
export function useRecordVaccination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      batchId: string;
      schedDay: number;
      task: string;
      givenAt: string;
      notes?: string;
    }) => {
      const supabase = createClientSupabase();
      const { data: profile } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from("batch_vaccinations")
        .insert({
          batch_id: data.batchId,
          sched_day: data.schedDay,
          task: data.task,
          given_at: data.givenAt,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      void profile;
      return row as BatchVaccinationRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batch-vaccinations"] }),
  });
}

// ---------- Staff (admin) ----------
export interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  archived_at: string | null;
  created_at: string;
}

export function useStaff() {
  return useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: () => api.get<StaffMember[]>("staff"),
  });
}

export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name?: string; role: Role }) => api.post("staff", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role?: Role; deactivate?: boolean }) => api.patch("staff", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

// ---------- Offline/online (used to disable mutations while offline) ----------
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
