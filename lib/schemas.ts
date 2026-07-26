import { z } from "zod";

// Shared entity schemas — single source of truth for client forms + API validation.
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
  batch: z.string().min(1),
  issue: z.string().min(1),
  affected: z.coerce.number().int().min(0),
  mortality: z.coerce.number().int().min(0),
  rx: z.string().optional().default(""),
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
  batch: z.string().min(1),
  issue: z.string().min(1),
  affected: z.coerce.number().int().min(0),
  loss: z.coerce.number().int().min(0),
  rx: z.string().optional().default(""),
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
  doe: z.string().min(1),
  buck: z.string().min(1),
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
});
export type Dog = z.infer<typeof DogSchema>;

export const DogHeatSchema = z.object({
  name: z.string().min(1),
  date: dateString,
});
export type DogHeat = z.infer<typeof DogHeatSchema>;

// ---------- Finance ----------
export const ExpenseSchema = z.object({
  cat: z.enum(["Feed", "Initial Stock/Purchase", "Medical", "Labor", "Equipment"]),
  desc: z.string().min(1),
  amount: z.coerce.number().min(0),
  date: dateString,
});
export type Expense = z.infer<typeof ExpenseSchema>;

export const RevenueSchema = z.object({
  cat: z.enum(["Poultry", "Vegetables", "Rabbitry", "Canine", "Other"]),
  batch: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  desc: z.string().optional().default(""),
  date: dateString,
});
export type Revenue = z.infer<typeof RevenueSchema>;
