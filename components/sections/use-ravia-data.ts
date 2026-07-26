"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, FinanceResponse, PoultryBatchRow, VegetableUnitRow, RabbitRow, DogRow } from "@/lib/api-client";

export function useFinance() {
  return useQuery<FinanceResponse>({
    queryKey: ["finance"],
    queryFn: () => api.get<FinanceResponse>("/api/finance"),
  });
}

export function usePoultryBatches() {
  return useQuery<PoultryBatchRow[]>({
    queryKey: ["poultry"],
    queryFn: () => api.get<PoultryBatchRow[]>("/api/poultry"),
  });
}

export function useVegetableUnits() {
  return useQuery<VegetableUnitRow[]>({
    queryKey: ["vegetables"],
    queryFn: () => api.get<VegetableUnitRow[]>("/api/vegetables"),
  });
}

export function useRabbits() {
  return useQuery<RabbitRow[]>({
    queryKey: ["rabbits"],
    queryFn: () => api.get<RabbitRow[]>("/api/rabbits"),
  });
}

export function useDogs() {
  return useQuery<DogRow[]>({
    queryKey: ["dogs"],
    queryFn: () => api.get<DogRow[]>("/api/dogs"),
  });
}

// Generic create mutation that invalidates the given query key.
export function useCreate(key: string, url: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post(url, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}
