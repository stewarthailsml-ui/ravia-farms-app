// Ravia Farms — domain constants.
// These are farm operating procedures, NOT arbitrary UI choices.
// In a later phase they become per-farm configurable (Farm.settings) with these as defaults.

export type SectionId =
  | "dashboard"
  | "poultry"
  | "vegetables"
  | "rabbits"
  | "dogs"
  | "finance"
  | "staff";

export const SECTIONS: SectionId[] = [
  "dashboard",
  "poultry",
  "vegetables",
  "rabbits",
  "dogs",
  "finance",
  "staff",
];

// Eggs per tray
export const EGGS_PER_TRAY = 30;

// Stems per vertical garden unit
export const STEMS_PER_UNIT = 84;

// The crops a vertical unit can be deployed as. Mirrors the enum in the Edge
// Function's VegetableUnitSchema — server schemas are not shared with the client
// bundle, so the two are kept in step by hand.
export const VEGETABLE_CROPS = ["Sukuma Wiki", "Spinach", "Managu", "Kienyeji Mix"] as const;
export type VegetableCrop = (typeof VEGETABLE_CROPS)[number];

// Poultry maturation cycle (days)
export const POULTRY_MATURATION_DAYS = 84;

// The breeds a batch can be deployed as. Mirrors the enum in the Edge Function's
// PoultryBatchSchema — server schemas are not shared with the client bundle, so
// the two are kept in step by hand. Anything reading breeds on the client should
// import this rather than re-declaring the list.
export const POULTRY_BREEDS = ["Sasso", "Kienyeji", "Layers", "Broilers"] as const;
export type PoultryBreed = (typeof POULTRY_BREEDS)[number];

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

// Human-readable age from an acquisition date. Deliberately coarse: a breeder
// cares that a doe is "8 mo", not that she is 247 days old. Months are the 30.44
// day average, so this is an approximation and should not be used for anything
// that needs exact cycle arithmetic — dayDiff is the primitive for that.
export function formatAge(date: string | Date): string {
  const days = Math.max(0, dayDiff(date));
  if (days < 60) return `${days} d`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`;
}

// Free-text breed fields get typed inconsistently ("New Zealand" vs
// "new zealand "), which would otherwise split one breed into several rows.
// Group on the normalised key, display the title-cased form.
export function normaliseBreedKey(breed: string): string {
  return breed.trim().toLowerCase().replace(/\s+/g, " ");
}

export function titleCaseBreed(breed: string): string {
  const key = normaliseBreedKey(breed);
  if (!key) return "Unspecified";
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDateLong(d: Date = new Date()): string {
  return d.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
