"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormGroup, TextInput, Select, InputRow, CalcPreview, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { todayISO, formatKES } from "@/lib/constants";
import { InputCategory, InputSector } from "@/lib/api-client";
import { useCreate, useInputs } from "../use-ravia-data";

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

// Labels for the DB's uppercase enums. Kept here rather than in lib/constants
// because they are presentation, not farm operating procedure.
export const INPUT_CATEGORY_LABELS: Record<InputCategory, string> = {
  FEED: "Feed",
  VACCINE: "Vaccine",
  PESTICIDE: "Pesticide",
  MEDICAL: "Medical / Treatment",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export const SECTOR_LABELS: Record<InputSector, string> = {
  POULTRY: "Poultry",
  VEGETABLES: "Vegetables",
  RABBITRY: "Rabbitry",
  CANINE: "Canine",
  GENERAL: "General / Farm-wide",
};

const CATEGORIES = Object.keys(INPUT_CATEGORY_LABELS) as InputCategory[];
const SECTORS = Object.keys(SECTOR_LABELS) as InputSector[];

// Sentinel for the "create the catalog entry inline" option, so a first-time
// purchase doesn't need a separate trip through a catalog screen.
const NEW_ITEM = "__new__";

export function LogPurchaseModal({ open, onClose }: ModalBaseProps) {
  const { data } = useInputs();
  // A purchase writes an EXPENSE and moves stock, so both caches go stale.
  const create = useCreate("input-purchases", "input-purchases", ["finance", "inputs"]);
  const { showToast } = useToast();

  const [itemId, setItemId] = useState(NEW_ITEM);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<InputCategory>("FEED");
  const [newUnitLabel, setNewUnitLabel] = useState("bags");
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [sector, setSector] = useState<InputSector>("POULTRY");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  const items = useMemo(() => data?.items ?? [], [data]);
  const suppliers = useMemo(() => data?.suppliers ?? [], [data]);
  const isNew = itemId === NEW_ITEM;
  const selected = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);
  const unitLabel = isNew ? newUnitLabel || "units" : (selected?.unit_label ?? "units");
  const total = qty * unitPrice;

  // Picking a known input prefills what it cost last time and who supplied it —
  // the point of input_items.last_supplier / last_unit_price.
  function onItemChange(next: string) {
    setItemId(next);
    const item = items.find((i) => i.id === next);
    if (!item) return;
    if (item.last_supplier) setSupplier(item.last_supplier);
    if (item.last_unit_price != null) setUnitPrice(Number(item.last_unit_price));
    setSector(item.sector);
  }

  function reset() {
    setItemId(NEW_ITEM);
    setNewName("");
    setNewCategory("FEED");
    setNewUnitLabel("bags");
    setSupplier("");
    setQty(1);
    setUnitPrice(0);
    setSector("POULTRY");
    setDate(todayISO());
    setNotes("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        ...(isNew
          ? { newName, newCategory, newUnitLabel, newSector: sector }
          : { itemId }),
        supplier,
        qty,
        unitPrice,
        sector,
        date,
        notes,
      });
      showToast("Purchase recorded and expensed.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to record purchase.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Purchase">
      <form onSubmit={onSubmit}>
        <FormGroup label="Input">
          <Select value={itemId} onChange={(e) => onItemChange(e.target.value)}>
            <option value={NEW_ITEM}>+ New input…</option>
            {CATEGORIES.map((c) => {
              const group = items.filter((i) => i.category === c);
              if (group.length === 0) return null;
              return (
                <optgroup key={c} label={INPUT_CATEGORY_LABELS[c]}>
                  {group.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit_label})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </FormGroup>

        {isNew ? (
          <>
            <FormGroup label="Input Name">
              <TextInput
                required
                placeholder="e.g. Grower Mash, Newcastle Vaccine, Ridomil"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </FormGroup>
            <InputRow>
              <FormGroup label="Category">
                <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value as InputCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {INPUT_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Unit">
                <TextInput
                  required
                  placeholder="bags, doses, litres, kg"
                  value={newUnitLabel}
                  onChange={(e) => setNewUnitLabel(e.target.value)}
                />
              </FormGroup>
            </InputRow>
          </>
        ) : null}

        <FormGroup label="Supplier">
          {/* Typed freely, but every supplier used before is offered back. */}
          <TextInput
            required
            list="ravia-suppliers"
            placeholder="e.g. Agrovet Ltd"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <datalist id="ravia-suppliers">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FormGroup>

        <InputRow>
          <FormGroup label={`Quantity (${unitLabel})`}>
            <TextInput
              type="number"
              min={0.01}
              step="any"
              required
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </FormGroup>
          <FormGroup label="Price per Unit (KES)">
            <TextInput
              type="number"
              min={0}
              step="any"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
            />
          </FormGroup>
        </InputRow>

        <CalcPreview tone="accent">
          {qty.toLocaleString()} {unitLabel} @ {formatKES(unitPrice)} = <span>{formatKES(total)}</span> KES
        </CalcPreview>

        <FormGroup label="Sector">
          <Select value={sector} onChange={(e) => setSector(e.target.value as InputSector)}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {SECTOR_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup label="Date">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>

        <FormGroup label="Notes">
          <TextInput
            placeholder="Invoice no., batch no. or other details"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormGroup>

        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={create.isPending}>
            Save Purchase
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function LogUsageModal({ open, onClose }: ModalBaseProps) {
  const { data } = useInputs();
  // No "finance" invalidation on purpose: usage posts no transaction. The cost
  // was booked at purchase, and booking it again would double-count it.
  const create = useCreate("input-usage", "input-usage", ["inputs"]);
  const { showToast } = useToast();

  const stock = useMemo(() => data?.stock ?? [], [data]);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [sector, setSector] = useState<InputSector>("POULTRY");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  const selected = useMemo(() => stock.find((s) => s.item_id === itemId), [stock, itemId]);
  const onHand = Number(selected?.on_hand ?? 0);

  function onItemChange(next: string) {
    setItemId(next);
    const item = stock.find((s) => s.item_id === next);
    if (item) setSector(item.sector);
  }

  function reset() {
    setItemId("");
    setQty(1);
    setSector("POULTRY");
    setDate(todayISO());
    setNotes("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ itemId, qty, sector, date, notes });
      showToast("Usage logged.");
      reset();
      onClose();
    } catch (err) {
      // The server's stock check is the real guard; it names the qty available.
      showToast(err instanceof Error ? err.message : "Failed to log usage.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Input Usage">
      <form onSubmit={onSubmit}>
        <FormGroup label="Input">
          <Select required value={itemId} onChange={(e) => onItemChange(e.target.value)}>
            <option value="">Select an input…</option>
            {stock.map((s) => (
              <option key={s.item_id} value={s.item_id}>
                {s.name} — {Number(s.on_hand).toLocaleString()} {s.unit_label} on hand
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup label={`Quantity Used${selected ? ` (${selected.unit_label})` : ""}`}>
          <TextInput
            type="number"
            min={0.01}
            step="any"
            max={onHand || undefined}
            required
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </FormGroup>

        {selected ? (
          <CalcPreview tone={qty > onHand ? "accent" : "primary"}>
            Remaining after this entry:{" "}
            <span>
              {(onHand - qty).toLocaleString()} {selected.unit_label}
            </span>
          </CalcPreview>
        ) : null}

        <FormGroup label="Sector">
          <Select value={sector} onChange={(e) => setSector(e.target.value as InputSector)}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {SECTOR_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup label="Date">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>

        <FormGroup label="Notes">
          <TextInput
            placeholder="e.g. Batch A morning feed"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormGroup>

        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            Log Usage
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
