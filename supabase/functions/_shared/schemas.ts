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
  // Vaccine/Pesticide were added alongside the inputs module so a manually
  // entered expense can use the same vocabulary an input purchase posts with.
  cat: z.enum([
    "Feed",
    "Vaccine",
    "Pesticide",
    "Initial Stock/Purchase",
    "Medical",
    "Labor",
    "Equipment",
  ]),
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

// Every revenue entry is a sale, and every sale draws down a real balance —
// which is why `sourceId` is an id now and not the display string it used to be.
// STOCK_KINDS mirrors the sales.stock_kind check constraint; 'NONE' is the
// deliberate escape hatch for money with no inventory behind it (general sales,
// one-off other income), not a default to fall back into.
export const STOCK_KINDS = [
  "POULTRY_BIRDS",
  "EGGS",
  "VEGETABLE_STEMS",
  "RABBIT",
  "DOG",
  "NONE",
] as const;
export type StockKind = (typeof STOCK_KINDS)[number];

export const RevenueSchema = z.object({
  type: z.literal("revenue").default("revenue"),
  cat: z.enum(["Poultry", "Vegetables", "Rabbitry", "Canine", "Other"]),
  stockKind: z.enum(STOCK_KINDS),
  // The batch/unit/animal being sold from. Required for everything that has a
  // balance; EGGS is farm-wide and NONE has no stock, so both leave it empty.
  sourceId: z.string().optional(),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  unitLabel: z.string().optional(),
  customer: z.string().optional().default(""),
  desc: z.string().optional().default(""),
  date: dateString,
}).refine(
  (v) => ["EGGS", "NONE"].includes(v.stockKind) || Boolean(v.sourceId),
  { message: "Select the batch, unit or animal this sale came from" },
);
export type Revenue = z.infer<typeof RevenueSchema>;

// Sector, not the display label: what the sales table and the stock views key on.
export const REVENUE_SECTOR: Record<string, string> = {
  Poultry: "POULTRY",
  Vegetables: "VEGETABLES",
  Rabbitry: "RABBITRY",
  Canine: "CANINE",
  Other: "GENERAL",
};

// ---------- Inputs & Stock ----------
export const INPUT_CATEGORIES = ["FEED", "VACCINE", "PESTICIDE", "MEDICAL", "EQUIPMENT", "OTHER"] as const;
export const INPUT_SECTORS = ["POULTRY", "VEGETABLES", "RABBITRY", "CANINE", "GENERAL"] as const;

const inputCategory = z.enum(INPUT_CATEGORIES);
const inputSector = z.enum(INPUT_SECTORS);

export const InputItemSchema = z.object({
  name: z.string().min(1),
  category: inputCategory,
  sector: inputSector.default("GENERAL"),
  unitLabel: z.string().min(1, "Unit is required"), // bags, doses, litres, kg
});
export type InputItem = z.infer<typeof InputItemSchema>;

// A purchase either names an existing catalog item (itemId) or creates one
// inline (newName + newCategory + newUnitLabel) — the modal's "+ New input…"
// path. Requiring one or the other keeps first-time purchases to a single trip.
export const InputPurchaseSchema = z.object({
  itemId: z.string().optional(),
  newName: z.string().optional(),
  newCategory: inputCategory.optional(),
  newUnitLabel: z.string().optional(),
  newSector: inputSector.optional(),
  supplier: z.string().min(1, "Supplier is required"),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  sector: inputSector,
  date: dateString,
  notes: z.string().optional().default(""),
}).refine(
  (v) => Boolean(v.itemId) || Boolean(v.newName && v.newCategory && v.newUnitLabel),
  { message: "Select an existing input, or provide a name, category and unit for a new one" },
);
export type InputPurchase = z.infer<typeof InputPurchaseSchema>;

// No amount, no finance posting: the cost was booked at purchase time, and
// booking it again here would double-count it in the P&L.
export const InputUsageSchema = z.object({
  itemId: z.string().min(1, "Input is required"),
  qty: z.coerce.number().positive(),
  sector: inputSector,
  date: dateString,
  notes: z.string().optional().default(""),
  // Populated only by the (not yet built) auto-decrement from module flows.
  sourceModule: z.enum(["POULTRY", "VEGETABLES", "RABBITRY", "CANINE"]).optional(),
  sourceRefId: z.string().optional(),
});
export type InputUsage = z.infer<typeof InputUsageSchema>;

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
