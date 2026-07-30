import { z } from "zod";

// Shared entity schemas — single source of truth for client forms + API validation.
// Canonical home is here (supabase/functions/_shared/) rather than lib/, because the
// Supabase CLI bundles each function's dependency graph starting from supabase/functions/;
// a relative import reaching above that root (as this used to) is not something the
// hosted `supabase functions deploy` bundler is guaranteed to follow.
// `lib/schemas.ts` re-exports this file for the Next.js side, so there is still one
// source of truth — it just lives here now.
//
// Numeric fields use z.coerce.number() (the Zod equivalent of class-validator's
// @Type(() => Number)) so FormData/JSON strings parse correctly.

const dateString = z.string().min(1, "Date is required");

// ---------- Poultry ----------
export const PoultryBatchSchema = z.object({
  name: z.string().min(1),
  breed: z.enum(["Sasso", "Kienyeji", "Layers", "Broilers"]),
  source: z.string().min(1),
  count: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
  date: dateString,
});
export type PoultryBatch = z.infer<typeof PoultryBatchSchema>;

export const EggRecordSchema = z.object({
  count: z.coerce.number().int().positive(),
  date: dateString,
});
export type EggRecord = z.infer<typeof EggRecordSchema>;

export const IncubationSchema = z.object({
  count: z.coerce.number().int().positive(),
  date: dateString,
});
export type Incubation = z.infer<typeof IncubationSchema>;

export const PoultryHealthSchema = z.object({
  batchId: z.string().optional(),
  batch: z.string().min(1),
  issue: z.string().min(1),
  affected: z.coerce.number().int().min(0),
  mortality: z.coerce.number().int().min(0),
  rx: z.string().optional().default(""),
  photoUrl: z.string().optional(),
});
export type PoultryHealth = z.infer<typeof PoultryHealthSchema>;

// ---------- Vegetables ----------
export const VegetableUnitSchema = z.object({
  type: z.enum(["Sukuma Wiki", "Spinach", "Managu", "Kienyeji Mix"]),
  source: z.string().min(1),
  units: z.coerce.number().int().positive(),
  pricePerStem: z.coerce.number().min(0),
  date: dateString,
});
export type VegetableUnit = z.infer<typeof VegetableUnitSchema>;

export const VegetableHealthSchema = z.object({
  unitId: z.string().optional(),
  batch: z.string().min(1),
  issue: z.string().min(1),
  affected: z.coerce.number().int().min(0),
  loss: z.coerce.number().int().min(0),
  rx: z.string().optional().default(""),
  photoUrl: z.string().optional(),
});
export type VegetableHealth = z.infer<typeof VegetableHealthSchema>;

// ---------- Rabbitry ----------
export const RabbitSchema = z.object({
  name: z.string().min(1),
  breed: z.string().min(1),
  sex: z.enum(["Doe (Female)", "Buck (Male)"]),
  source: z.string().min(1),
  price: z.coerce.number().min(0),
  date: dateString,
});
export type Rabbit = z.infer<typeof RabbitSchema>;

export const RabbitPairingSchema = z.object({
  doeId: z.string().min(1, "Doe is required"),
  buckId: z.string().min(1, "Buck is required"),
  date: dateString,
});
export type RabbitPairing = z.infer<typeof RabbitPairingSchema>;

// ---------- Canine ----------
export const DogSchema = z.object({
  name: z.string().min(1),
  breed: z.string().min(1),
  sex: z.enum(["Bitch (Female)", "Dog (Male)"]),
  source: z.string().min(1),
  price: z.coerce.number().min(0),
  pedigree: z.string().optional().default(""),
  date: dateString,
});
export type Dog = z.infer<typeof DogSchema>;

export const DogHeatSchema = z.object({
  dogId: z.string().min(1, "Dog is required"),
  date: dateString,
});
export type DogHeat = z.infer<typeof DogHeatSchema>;

// ---------- Finance ----------
// `type` is explicit (not shape-sniffed) so the API can dispatch without guessing.
export const ExpenseSchema = z.object({
  type: z.literal("expense").default("expense"),
  cat: z.enum(["Feed", "Initial Stock/Purchase", "Medical", "Labor", "Equipment"]),
  desc: z.string().min(1),
  // Feed category derives amount from bags * pricePerBag (spec's breakdown line);
  // all other categories use the flat `amount` field.
  bags: z.coerce.number().positive().optional(),
  pricePerBag: z.coerce.number().min(0).optional(),
  amount: z.coerce.number().min(0).optional(),
  date: dateString,
}).refine(
  (v) => (v.cat === "Feed" ? v.bags !== undefined && v.pricePerBag !== undefined : v.amount !== undefined),
  { message: "Feed requires bags + pricePerBag; other categories require amount" },
);
export type Expense = z.infer<typeof ExpenseSchema>;

export const RevenueSchema = z.object({
  type: z.literal("revenue").default("revenue"),
  cat: z.enum(["Poultry", "Vegetables", "Rabbitry", "Canine", "Other"]),
  batch: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  desc: z.string().optional().default(""),
  date: dateString,
});
export type Revenue = z.infer<typeof RevenueSchema>;

// ---------- Staff (admin) ----------
export const StaffInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["OWNER", "MANAGER", "FARM_HAND", "VET"]),
});
export type StaffInvite = z.infer<typeof StaffInviteSchema>;

export const StaffUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "MANAGER", "FARM_HAND", "VET"]).optional(),
  deactivate: z.boolean().optional(),
});
export type StaffUpdate = z.infer<typeof StaffUpdateSchema>;
