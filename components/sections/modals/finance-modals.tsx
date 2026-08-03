"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormGroup, TextInput, Select, InputRow, CalcPreview, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { todayISO, formatKES } from "@/lib/constants";
import { useCreate, usePoultryBatches, useVegetableUnits, useRabbits, useDogs } from "../use-ravia-data";

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

export function LogRevenueModal({ open, onClose }: ModalBaseProps) {
  const { data: poultry } = usePoultryBatches();
  const { data: veg } = useVegetableUnits();
  const { data: rabbits } = useRabbits();
  const { data: dogs } = useDogs();
  const create = useCreate("finance", "finance");
  const { showToast } = useToast();

  const [cat, setCat] = useState<(typeof REVENUE_CATS)[number]>("Poultry");
  const [batch, setBatch] = useState("General Sales");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(todayISO());

  const options = (() => {
    const base = ["General Sales"];
    if (cat === "Poultry") return [...base, ...(poultry ?? []).map((b) => b.name), "Layers/Eggs"];
    if (cat === "Vegetables") return [...base, ...(veg ?? []).map((v) => `${v.crop_type} (${v.deploy_date})`)];
    if (cat === "Rabbitry") return [...base, ...(rabbits ?? []).map((r) => r.tag_id)];
    if (cat === "Canine") return [...base, ...(dogs ?? []).map((d) => d.name)];
    return base;
  })();

  const total = qty * unitPrice;

  function onCatChange(next: string) {
    setCat(next as typeof cat);
    setBatch("General Sales");
  }

  function reset() {
    setCat("Poultry");
    setBatch("General Sales");
    setQty(1);
    setUnitPrice(0);
    setDesc("");
    setDate(todayISO());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ type: "revenue", cat, batch, qty, unitPrice, desc, date });
      showToast("Revenue saved.");
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
          <Select value={batch} onChange={(e) => setBatch(e.target.value)}>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </FormGroup>
        <InputRow>
          <FormGroup label="Quantity Sold">
            <TextInput
              type="number"
              min={0.1}
              step="any"
              value={qty}
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
        <CalcPreview tone="accent">
          Total Revenue: <span>{formatKES(total)}</span> KES
        </CalcPreview>
        <FormGroup label="Description / Notes">
          <TextInput
            placeholder="Customer name or specific details"
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
