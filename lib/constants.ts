// Ravia Farms — domain constants.
// These are farm operating procedures, NOT arbitrary UI choices.
// In a later phase they become per-farm configurable (Farm.settings) with these as defaults.

export type SectionId =
  | "dashboard"
  | "poultry"
  | "vegetables"
  | "rabbits"
  | "dogs"
  | "finance";

export const SECTIONS: SectionId[] = [
  "dashboard",
  "poultry",
  "vegetables",
  "rabbits",
  "dogs",
  "finance",
];

// Eggs per tray
export const EGGS_PER_TRAY = 30;

// Stems per vertical garden unit
export const STEMS_PER_UNIT = 84;

// Poultry maturation cycle (days)
export const POULTRY_MATURATION_DAYS = 84;

// Silverlands vaccination schedule (day -> task)
export const SILVERLANDS_VAC: { day: number; task: string }[] = [
  { day: 0, task: "Mareks, NCD+IB" },
  { day: 12, task: "NCD+IB (W)" },
  { day: 14, task: "Gumboro (W)" },
  { day: 21, task: "Gumboro (W)" },
  { day: 28, task: "NCD+IB (W)" },
  { day: 42, task: "NCD+IB (W)" },
];

// Incubation window (days)
export const INCUBATION_DAYS = 21;

// Rabbit kindling gestation (days) + alert window
export const RABBIT_KINDLING_DAYS = 31;
export const RABBIT_KINDLING_ALERT = { min: 28, max: 31 };

// Canine heat recurrence (days) + alert window
export const CANINE_HEAT_DAYS = 180;
export const CANINE_HEAT_ALERT = { min: 170, max: 180 };

// Currency / locale
export const CURRENCY = "KES";
export const LOCALE = "en-KE";

export function formatKES(amount: number): string {
  return amount.toLocaleString(LOCALE);
}

// Whole-day difference between two dates (d2 - d1)
export function dayDiff(d1: string | Date, d2: Date = new Date()): number {
  const a = typeof d1 === "string" ? new Date(d1) : d1;
  return Math.ceil((d2.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDateLong(d: Date = new Date()): string {
  return d.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
