"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { FormGroup, TextInput, TextArea, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  SILVERLANDS_VAC,
  POULTRY_MATURATION_DAYS,
  VACCINE_OVERDUE_GRACE_DAYS,
  dayDiff,
  todayISO,
  vaccineStatus,
} from "@/lib/constants";
import type { PoultryBatchRow, VegetableUnitRow } from "@/lib/api-client";
import {
  usePoultryHealth,
  useVegetableHealth,
  useBatchVaccinations,
  useRecordVaccination,
} from "../use-ravia-data";

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Shared shell — one modal component per sector keeps the "click a lot card"
// interaction identical across the farm, while the body stays sector-specific.
// ---------------------------------------------------------------------------

function IncidentList({
  rows,
}: {
  rows: { id: string; date: string; issue: string; affected: number; damage: number; rx: string | null; unit: string }[];
}) {
  if (rows.length === 0) {
    return <p className="text-muted text-sm py-3">No incidents logged for this lot.</p>;
  }
  return (
    <div className="max-h-44 overflow-y-auto mb-4">
      {rows.map((r) => (
        <div key={r.id} className="py-2 border-b border-hairline text-sm flex justify-between gap-3">
          <div>
            <Tag tone="danger">{r.issue}</Tag>
            <span className="ml-2 text-muted">
              {r.affected} affected · {r.damage} {r.unit}
            </span>
            {r.rx ? <p className="text-[0.75rem] text-muted mt-0.5">{r.rx}</p> : null}
          </div>
          <small className="text-muted shrink-0">{r.date}</small>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poultry lot detail: incidents + the real vaccination schedule.
// ---------------------------------------------------------------------------

const CHIP_STYLES: Record<string, string> = {
  done: "border-primary bg-primary/10",
  due: "border-warning bg-warning/10",
  overdue: "border-danger bg-danger/10",
  pending: "border-hairline bg-[#1a1a1a]",
};

export function PoultryLotDetailModal({
  open,
  onClose,
  batch,
  onLogIncident,
}: ModalBaseProps & {
  batch: PoultryBatchRow | null;
  /** Hands off to the health modal prefilled with this batch. */
  onLogIncident: (batchId: string) => void;
}) {
  const { data: health } = usePoultryHealth();
  const { data: vaccinations } = useBatchVaccinations();
  const record = useRecordVaccination();
  const { showToast } = useToast();

  const [notesFor, setNotesFor] = useState<number | null>(null);
  const [doseNotes, setDoseNotes] = useState("");
  const [givenAt, setGivenAt] = useState(todayISO());

  const incidents = useMemo(
    () =>
      (health ?? [])
        .filter((h) => h.batch_id !== null && h.batch_id === batch?.id)
        .map((h) => ({
          id: h.id,
          date: new Date(h.date).toISOString().split("T")[0],
          issue: h.issue,
          affected: h.affected,
          damage: h.mortality,
          rx: h.rx,
          unit: "deaths",
        })),
    [health, batch?.id],
  );

  if (!batch) return null;

  const age = dayDiff(batch.deploy_date);
  const givenByDay = new Map(
    (vaccinations ?? [])
      .filter((v) => v.batch_id === batch.id)
      .map((v) => [v.sched_day, v]),
  );

  async function onRecordDose(schedDay: number, task: string) {
    try {
      await record.mutateAsync({
        batchId: batch!.id,
        schedDay,
        task,
        givenAt,
        notes: doseNotes || undefined,
      });
      showToast(`Vaccine recorded for ${batch!.name} (day ${schedDay}).`);
      setNotesFor(null);
      setDoseNotes("");
      setGivenAt(todayISO());
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to record vaccine.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${batch.name} — Lot Detail`}>
      <p className="text-muted text-sm mb-1">
        {batch.breed} · from {batch.source} · deployed{" "}
        {new Date(batch.deploy_date).toISOString().split("T")[0]}
      </p>
      <p className="text-sm mb-4">
        <strong>{batch.on_hand}</strong> of {batch.deployed} birds on hand · Day {age}/
        {POULTRY_MATURATION_DAYS}
      </p>

      <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted mb-2">
        Vaccination Schedule (Silverlands)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
        {SILVERLANDS_VAC.map((v) => {
          const status = vaccineStatus(v.day, age, givenByDay.get(v.day)?.given_at ?? null);
          const tone =
            status.state === "done" ? "success" : status.state === "overdue" ? "danger" : status.state === "due" ? "warning" : "neutral";
          return (
            <div
              key={v.day}
              className={`rounded-md border p-2 ${CHIP_STYLES[status.state]}`}
            >
              <div className="flex justify-between items-center">
                <h4 className="text-[0.7rem]">Day {v.day}</h4>
                <Tag tone={tone}>
                  {status.state === "done"
                    ? `Done`
                    : status.state === "overdue"
                      ? `Overdue ${status.daysLate}d`
                      : status.state === "due"
                        ? "Due now"
                        : "Pending"}
                </Tag>
              </div>
              <p className="text-[0.65rem] text-muted mt-1">{v.task}</p>
              {status.state === "done" ? (
                <p className="text-[0.6rem] text-muted mt-1">
                  Given {new Date(status.givenAt).toISOString().split("T")[0]}
                </p>
              ) : status.state !== "pending" ? (
                notesFor === v.day ? (
                  <div className="mt-2 space-y-2">
                    <FormGroup label="Date given">
                      <TextInput
                        type="date"
                        required
                        value={givenAt}
                        onChange={(e) => setGivenAt(e.target.value)}
                      />
                    </FormGroup>
                    <TextInput
                      placeholder="Batch no., route, notes…"
                      value={doseNotes}
                      onChange={(e) => setDoseNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={record.isPending}
                        onClick={() => onRecordDose(v.day, v.task)}
                      >
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setNotesFor(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2 !py-1 !text-[0.65rem]"
                    onClick={() => {
                      setNotesFor(v.day);
                      setDoseNotes("");
                      setGivenAt(todayISO());
                    }}
                  >
                    Record dose
                  </Button>
                )
              ) : null}
            </div>
          );
        })}
      </div>

      <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted mb-2">
        Incidents ({incidents.length})
      </h3>
      <IncidentList rows={incidents} />

      <ModalActions>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            onClose();
            onLogIncident(batch.id);
          }}
        >
          Log incident for this lot
        </Button>
      </ModalActions>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Vegetable unit detail: same pattern, losses instead of mortality.
// ---------------------------------------------------------------------------

export function VegetableLotDetailModal({
  open,
  onClose,
  unit,
  onLogIncident,
}: ModalBaseProps & {
  unit: VegetableUnitRow | null;
  onLogIncident: (unitId: string) => void;
}) {
  const { data: health } = useVegetableHealth();

  const incidents = useMemo(
    () =>
      (health ?? [])
        .filter((h) => h.unit_id !== null && h.unit_id === unit?.id)
        .map((h) => ({
          id: h.id,
          date: new Date(h.date).toISOString().split("T")[0],
          issue: h.issue,
          affected: h.affected,
          damage: h.loss,
          rx: h.rx,
          unit: "stems lost",
        })),
    [health, unit?.id],
  );

  if (!unit) return null;

  return (
    <Modal open={open} onClose={onClose} title={`${unit.crop_type} Unit — Lot Detail`}>
      <p className="text-muted text-sm mb-1">
        From {unit.source} · deployed {new Date(unit.deploy_date).toISOString().split("T")[0]}
      </p>
      <p className="text-sm mb-4">
        <strong>{unit.on_hand}</strong> of {unit.deployed} stems on hand
        {unit.sold > 0 ? ` · ${unit.sold} sold` : null}
      </p>

      <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted mb-2">
        Incidents ({incidents.length})
      </h3>
      <IncidentList rows={incidents} />

      <p className="text-[0.7rem] text-muted mt-2 mb-4">
        Vegetables carry no vaccination schedule — disease pressure is handled through
        incident logging and treatment.
      </p>

      <ModalActions>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            onClose();
            onLogIncident(unit.id);
          }}
        >
          Log incident for this lot
        </Button>
      </ModalActions>
    </Modal>
  );
}

// Re-exported for views that render the grace window in copy.
export { VACCINE_OVERDUE_GRACE_DAYS };
