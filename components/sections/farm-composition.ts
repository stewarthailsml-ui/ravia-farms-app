// Grouping helpers behind the farm outlook. These live apart from the views
// because the poultry split is rendered in two places — the Poultry Hub and the
// dashboard — and two copies of the same reduce would drift.
//
// Every helper returns rows shaped for <CompositionCard>, including categories
// at zero, so a card's shape stays stable as stock comes and goes.

import { CompositionRow } from "@/components/ui/composition-card";
import { PoultryBatchRow, VegetableUnitRow } from "@/lib/api-client";
import {
  POULTRY_BREEDS,
  VEGETABLE_CROPS,
  normaliseBreedKey,
  titleCaseBreed,
} from "@/lib/constants";

/** Rabbits and dogs share this shape; both model a sale as a state change. */
interface IndividualAnimal {
  breed: string;
  sex: string;
  sold_at: string | null;
}

/** A sold animal keeps its row for its breeding history, so presence is not-sold. */
export function liveAnimals<T extends { sold_at: string | null }>(rows: T[] | undefined): T[] {
  return (rows ?? []).filter((r) => r.sold_at === null);
}

/** Sex is a fixed dropdown, but the wording differs per species — match the marker. */
export function isFemale(sex: string): boolean {
  return sex.includes("(Female)");
}

export function poultryByBreed(batches: PoultryBatchRow[] | undefined) {
  const list = batches ?? [];

  const acc = new Map<string, { deployed: number; mortality: number; sold: number; onHand: number; batches: number }>();
  for (const b of list) {
    const row = acc.get(b.breed) ?? { deployed: 0, mortality: 0, sold: 0, onHand: 0, batches: 0 };
    row.deployed += Number(b.deployed);
    row.mortality += Number(b.mortality);
    row.sold += Number(b.sold);
    row.onHand += Number(b.on_hand);
    row.batches += 1;
    acc.set(b.breed, row);
  }

  // Canonical breeds first and always present, then anything found on a batch but
  // missing from the list (legacy or renamed) so rows always sum to the total.
  const names = [
    ...POULTRY_BREEDS,
    ...[...acc.keys()].filter((k) => !POULTRY_BREEDS.includes(k as (typeof POULTRY_BREEDS)[number])),
  ];

  const rows: CompositionRow[] = names.map((breed) => {
    const v = acc.get(breed);
    return {
      label: breed,
      value: v?.onHand ?? 0,
      detail: v
        ? `deployed ${v.deployed} · mortality ${v.mortality} · sold ${v.sold} · ${v.batches} ${v.batches === 1 ? "batch" : "batches"}`
        : undefined,
    };
  });

  return {
    rows,
    totalOnHand: list.reduce((a, b) => a + Number(b.on_hand), 0),
    totalBatches: list.length,
  };
}

export function vegetablesByCrop(units: VegetableUnitRow[] | undefined) {
  const list = units ?? [];

  const acc = new Map<string, { deployed: number; loss: number; sold: number; onHand: number; units: number }>();
  for (const u of list) {
    const row = acc.get(u.crop_type) ?? { deployed: 0, loss: 0, sold: 0, onHand: 0, units: 0 };
    row.deployed += Number(u.deployed);
    row.loss += Number(u.loss);
    row.sold += Number(u.sold);
    row.onHand += Number(u.on_hand);
    row.units += Number(u.units);
    acc.set(u.crop_type, row);
  }

  const names = [
    ...VEGETABLE_CROPS,
    ...[...acc.keys()].filter((k) => !VEGETABLE_CROPS.includes(k as (typeof VEGETABLE_CROPS)[number])),
  ];

  const rows: CompositionRow[] = names.map((crop) => {
    const v = acc.get(crop);
    return {
      label: crop,
      value: v?.onHand ?? 0,
      detail: v
        ? `${v.units} ${v.units === 1 ? "unit" : "units"} · deployed ${v.deployed} · lost ${v.loss} · sold ${v.sold}`
        : undefined,
    };
  });

  return {
    rows,
    totalStems: list.reduce((a, u) => a + Number(u.on_hand), 0),
    totalUnits: list.reduce((a, u) => a + Number(u.units), 0),
  };
}

/**
 * Rabbits and dogs, grouped by breed. Breed is free text, so grouping keys off a
 * normalised form — otherwise "New Zealand" and "new zealand " become two breeds.
 */
export function animalsByBreed(
  animals: IndividualAnimal[],
  femaleLabel: string,
  maleLabel: string,
) {
  const acc = new Map<string, { display: string; total: number; females: number }>();
  for (const a of animals) {
    const key = normaliseBreedKey(a.breed);
    const row = acc.get(key) ?? { display: titleCaseBreed(a.breed), total: 0, females: 0 };
    row.total += 1;
    if (isFemale(a.sex)) row.females += 1;
    acc.set(key, row);
  }

  const rows: CompositionRow[] = [...acc.values()]
    .sort((a, b) => b.total - a.total || a.display.localeCompare(b.display))
    .map((v) => ({
      label: v.display,
      value: v.total,
      detail: `${v.females} ${femaleLabel} · ${v.total - v.females} ${maleLabel}`,
    }));

  const females = animals.filter((a) => isFemale(a.sex)).length;
  return { rows, total: animals.length, females, males: animals.length - females };
}
