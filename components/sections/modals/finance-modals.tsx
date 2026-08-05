"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormGroup, TextInput, Select, InputRow, CalcPreview, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { todayISO, formatKES } from "@/lib/constants";
import {
  useCreate,
  usePoultryBatches,
  useVegetableUnits,
  useRabbits,
  useDogs,
  useEggStock,
} from "../use-ravia-data";
import type { StockKind } from "@/lib/api-client";

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

// Mirrors ExpenseSchema's enum. Vaccine/Pesticide match what an input purchase
// posts, so a manually entered expense lands in the same category as the
// equivalent purchase rather than a parallel one.
const EXPENSE_CATS = [
  "Feed",
  "Vaccine",
  "Pesticide",
  "Initial Stock/Purchase",
  "Medical",
  "Labor",
  "Equipment",
] as const;
const REVENUE_CATS = ["Poultry", "Vegetables", "Rabbitry", "Canine", "Other"] as const;

export function LogExpenseModal({ open, onClose }: ModalBaseProps) {
  const create = useCreate("finance", "finance");
  const { showToast } = useToast();
  const [cat, setCat] = useState<(typeof EXPENSE_CATS)[number]>("Feed");
  const [desc, setDesc] = useState("");
  const [bags, setBags] = useState(1);
  const [pricePerBag, setPricePerBag] = useState(2800);
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());

  const isFeed = cat === "Feed";

  function reset() {
    setCat("Feed");
    setDesc("");
    setBags(1);
    setPricePerBag(2800);
    setAmount(0);
    setDate(todayISO());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        type: "expense",
        cat,
        desc,
        date,
        ...(isFeed ? { bags, pricePerBag } : { amount }),
      });
      showToast("Expense saved.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save expense.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Expense">
      <form onSubmit={onSubmit}>
        <FormGroup label="Category">
          <Select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}>
            {EXPENSE_CATS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </FormGroup>
        {isFeed ? (
          <InputRow>
            <FormGroup label="Bags (Qty)">
              <TextInput type="number" min={1} value={bags} onChange={(e) => setBags(Number(e.target.value))} />
            </FormGroup>
            <FormGroup label="Price per Bag (KES)">
              <TextInput
                type="number"
                min={0}
                value={pricePerBag}
                onChange={(e) => setPricePerBag(Number(e.target.value))}
              />
            </FormGroup>
          </InputRow>
        ) : null}
        <FormGroup label="Description">
          <TextInput required placeholder="e.g. Grower Mash" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </FormGroup>
        {!isFeed ? (
          <FormGroup label="Total Amount (KES)">
            <TextInput type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FormGroup>
        ) : null}
        <FormGroup label="Date">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={create.isPending}>
            Save Expense
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

// A sale is a stock movement that happens to earn money, so the source dropdown
// carries the record's id — not the display string it used to post, which the
// server could only ever write into a description. The id is what lets
// record_sale draw the birds/stems/eggs down and link the revenue back.
const GENERAL = "__general";
const EGGS = "__eggs";

interface SourceOption {
  id: string;
  label: string;
  stockKind: StockKind;
  unitLabel: string;
  onHand: number | null; // null = no balance to check (general sales)
}

export function LogRevenueModal({ open, onClose }: ModalBaseProps) {
  const { data: poultry } = usePoultryBatches();
  const { data: veg } = useVegetableUnits();
  const { data: rabbits } = useRabbits();
  const { data: dogs } = useDogs();
  const { data: eggStock } = useEggStock();
  // Every sector's stock moved, so every sector's cache is stale the moment this
  // succeeds — the server wrote rows the client never asked for.
  const create = useCreate("finance", "finance", [
    "sales",
    "poultry",
    "eggs",
    "egg-stock",
    "vegetables",
    "rabbits",
    "dogs",
  ]);
  const { showToast } = useToast();

  const [cat, setCat] = useState<(typeof REVENUE_CATS)[number]>("Poultry");
  const [sourceId, setSourceId] = useState(GENERAL);
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customer, setCustomer] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayISO());

  const options: SourceOption[] = (() => {
    const general: SourceOption = {
      id: GENERAL,
      label: "General Sales (no stock)",
      stockKind: "NONE",
      unitLabel: "units",
      onHand: null,
    };
    if (cat === "Poultry")
      return [
        general,
        {
          id: EGGS,
          label: `Layers/Eggs — ${eggStock?.on_hand ?? 0} available`,
          stockKind: "EGGS",
          unitLabel: "eggs",
          onHand: eggStock?.on_hand ?? 0,
        },
        ...(poultry ?? []).map((b) => ({
          id: b.id,
          label: `${b.name} — ${b.on_hand} birds available`,
          stockKind: "POULTRY_BIRDS" as StockKind,
          unitLabel: "birds",
          onHand: b.on_hand,
        })),
      ];
    if (cat === "Vegetables")
      return [
        general,
        ...(veg ?? []).map((v) => ({
          id: v.id,
          label: `${v.crop_type} (${v.deploy_date}) — ${v.on_hand} stems available`,
          stockKind: "VEGETABLE_STEMS" as StockKind,
          unitLabel: "stems",
          onHand: v.on_hand,
        })),
      ];
    // An animal is sold once and whole, so only unsold ones are offered.
    if (cat === "Rabbitry")
      return [
        general,
        ...(rabbits ?? [])
          .filter((r) => !r.sold_at)
          .map((r) => ({
            id: r.id,
            label: `${r.tag_id} (${r.breed})`,
            stockKind: "RABBIT" as StockKind,
            unitLabel: "animal",
            onHand: 1,
          })),
      ];
    if (cat === "Canine")
      return [
        general,
        ...(dogs ?? [])
          .filter((d) => !d.sold_at)
          .map((d) => ({
            id: d.id,
            label: `${d.name} (${d.breed})`,
            stockKind: "DOG" as StockKind,
            unitLabel: "animal",
            onHand: 1,
          })),
      ];
    return [general];
  })();

  const selected = options.find((o) => o.id === sourceId) ?? options[0];
  const isAnimal = selected.stockKind === "RABBIT" || selected.stockKind === "DOG";
  const effectiveQty = isAnimal ? 1 : qty;
  const total = effectiveQty * unitPrice;
  // Advisory only — record_sale is the boundary that actually refuses. Showing it
  // here means the farm hand finds out before typing a price, not after.
  const overSold = selected.onHand !== null && effectiveQty > selected.onHand;

  function onCatChange(next: string) {
    setCat(next as typeof cat);
    setSourceId(GENERAL);
    setQty(1);
  }

  function reset() {
    setCat("Poultry");
    setSourceId(GENERAL);
    setQty(1);
    setUnitPrice(0);
    setCustomer("");
    setDesc("");
    setDate(todayISO());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        type: "revenue",
        cat,
        stockKind: selected.stockKind,
        sourceId: selected.stockKind === "NONE" || selected.stockKind === "EGGS" ? undefined : selected.id,
        qty: effectiveQty,
        unitPrice,
        unitLabel: selected.unitLabel,
        customer,
        desc,
        date,
      });
      showToast("Revenue saved and stock updated.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save revenue.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Revenue">
      <form onSubmit={onSubmit}>
        <FormGroup label="Revenue Source Type">
          <Select value={cat} onChange={(e) => onCatChange(e.target.value)}>
            {REVENUE_CATS.map((c) => (
              <option key={c} value={c}>
                {c === "Other" ? "Other Revenue" : c}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Source Batch / Item">
          <Select value={selected.id} onChange={(e) => setSourceId(e.target.value)}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormGroup>
        <InputRow>
          <FormGroup
            label={isAnimal ? "Quantity Sold (one animal)" : `Quantity Sold (${selected.unitLabel})`}
          >
            <TextInput
              type="number"
              min={isAnimal ? 1 : 0.1}
              max={selected.onHand ?? undefined}
              step="any"
              disabled={isAnimal}
              value={effectiveQty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </FormGroup>
          <FormGroup label="Price per Unit (KES)">
            <TextInput
              type="number"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
            />
          </FormGroup>
        </InputRow>
        {overSold ? (
          <CalcPreview tone="danger">
            Only <span>{selected.onHand}</span> {selected.unitLabel} in stock.
          </CalcPreview>
        ) : null}
        <CalcPreview tone="accent">
          Total Revenue: <span>{formatKES(total)}</span> KES
        </CalcPreview>
        <FormGroup label="Customer">
          <TextInput placeholder="Who bought it" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </FormGroup>
        <FormGroup label="Description / Notes">
          <TextInput
            placeholder="Specific details"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Date">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={create.isPending}>
            Save Revenue
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
