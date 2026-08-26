"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormGroup, TextInput, Select, InputRow, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "@/lib/constants";
import { useCreate, useRabbits } from "../use-ravia-data";

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

export function RegisterRabbitModal({ open, onClose }: ModalBaseProps) {
  // Also invalidates "finance": registering a rabbit posts its purchase expense.
  const create = useCreate("rabbits", "rabbits", ["finance"]);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    breed: "",
    sex: "Doe (Female)",
    source: "",
    price: 0,
    date: todayISO(),
  });

  function reset() {
    setForm({ name: "", breed: "", sex: "Doe (Female)", source: "", price: 0, date: todayISO() });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      showToast("Rabbit registered and expense recorded.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to register rabbit.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Rabbit Registration">
      <form onSubmit={onSubmit}>
        <FormGroup label="Tag ID / Name">
          <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormGroup>
        <FormGroup label="Breed">
          <TextInput required value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
        </FormGroup>
        <FormGroup label="Sex">
          <Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option>Doe (Female)</option>
            <option>Buck (Male)</option>
          </Select>
        </FormGroup>
        <FormGroup label="Source / Supplier">
          <TextInput required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </FormGroup>
        <InputRow>
          <FormGroup label="Purchase Price (KES)">
            <TextInput
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </FormGroup>
          <FormGroup label="Acquisition Date">
            <TextInput type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FormGroup>
        </InputRow>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="deploy" disabled={create.isPending}>
            Register &amp; Log Expense
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function NewPairingModal({ open, onClose }: ModalBaseProps) {
  const { data: rabbits } = useRabbits();
  const does = (rabbits ?? []).filter((r) => r.sex.includes("Doe"));
  const bucks = (rabbits ?? []).filter((r) => r.sex.includes("Buck"));
  const create = useCreate("rabbit-pairings", "rabbit-pairings");
  const { showToast } = useToast();

  const [doeId, setDoeId] = useState("");
  const [buckId, setBuckId] = useState("");
  const [date, setDate] = useState(todayISO());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ doeId, buckId, date });
      showToast("Pairing logged.");
      setDoeId("");
      setBuckId("");
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to log pairing.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Pairing">
      <form onSubmit={onSubmit}>
        <FormGroup label="Doe">
          <Select required value={doeId} onChange={(e) => setDoeId(e.target.value)}>
            <option value="" disabled>
              Select a doe…
            </option>
            {does.map((r) => (
              <option key={r.id} value={r.id}>
                {r.tag_id}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Buck">
          <Select required value={buckId} onChange={(e) => setBuckId(e.target.value)}>
            <option value="" disabled>
              Select a buck…
            </option>
            {bucks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.tag_id}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Date">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending || !doeId || !buckId}>
            Pair
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
