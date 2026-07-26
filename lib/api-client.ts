// Client-side fetch helpers for the Ravia API (Route Handlers).
// All responses are farm-scoped server-side via the session.

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(data) }),
};

export interface FinanceSummary {
  revenue: number;
  expenses: number;
  net: number;
}

export interface FinanceTxn {
  id: string;
  type: "REVENUE" | "EXPENSE";
  category: string;
  description: string;
  qty: number | null;
  unitPrice: number | null;
  amount: number;
  unitLabel: string | null;
  date: string;
}

export interface FinanceResponse {
  summary: FinanceSummary;
  transactions: FinanceTxn[];
}

export interface PoultryBatchRow {
  id: string;
  name: string;
  breed: string;
  source: string;
  count: number;
  unitPrice: number;
  deployDate: string;
}

export interface VegetableUnitRow {
  id: string;
  cropType: string;
  source: string;
  units: number;
  pricePerStem: number;
  stems: number;
  deployDate: string;
}

export interface RabbitRow {
  id: string;
  tagId: string;
  breed: string;
  sex: string;
  source: string;
  price: number;
}

export interface DogRow {
  id: string;
  name: string;
  breed: string;
  sex: string;
  source: string;
  price: number;
}
