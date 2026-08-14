"use client";

import { CompositionCard } from "@/components/ui/composition-card";
import { usePoultryBatches } from "./use-ravia-data";
import { poultryByBreed } from "./farm-composition";

export function PoultrySpeciesMap() {
  // Deliberately unparameterised: the archive filter is exclusive (archived=true
  // returns *only* archived rows), so passing the Poultry Hub's toggle through
  // here would swap this card over to retired batches. The species split is a
  // statement about the live flock, so it always reads the live query.
  const { data: batches } = usePoultryBatches();
  const { rows, totalOnHand, totalBatches } = poultryByBreed(batches);

  return (
    <div className="mb-6">
      <CompositionCard
        title="Species Deployed"
        icon="fa-kiwi-bird"
        total={totalOnHand}
        unitLabel="birds on hand"
        subLine={`${totalBatches} ${totalBatches === 1 ? "batch" : "batches"}`}
        rows={rows}
        emptyMessage="No batches yet. Deploy your first batch to begin."
      />
    </div>
  );
}
