"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormGroup, TextInput, Select, InputRow, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "@/lib/constants";
import { useCreate, useDogs } from "../use-ravia-data";

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

export function RegisterDogModal({ open, onClose }: ModalBaseProps) {
  // Also invalidates "finance": registering a dog posts its purchase expense.
  const create = useCreate("dogs", "dogs", ["finance"]);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    breed: "",
    sex: "Bitch (Female)",
    source: "",
    price: 0,
    pedigree: "",
    date: todayISO(),
  });

  function reset() {
    setForm({ name: "", breed: "", sex: "Bitch (Female)", source: "", price: 0, pedigree: "", date: todayISO() });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      showToast("Dog registered and expense recorded.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to register dog.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Canine Registration">
      <form onSubmit={onSubmit}>
        <FormGroup label="Name">
          <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormGroup>
        <FormGroup label="Breed">
          <TextInput required value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
        </FormGroup>
        <FormGroup label="Sex">
          <Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option>Bitch (Female)</option>
            <option>Dog (Male)</option>
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
          <FormGroup label="Pedigree Detail">
            <TextInput
              placeholder="e.g. KCP Certified"
              value={form.pedigree}
              onChange={(e) => setForm({ ...form, pedigree: e.target.value })}
            />
          </FormGroup>
        </InputRow>
        <FormGroup label="Acquisition Date">
          <TextInput type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </FormGroup>
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

export function LogHeatEventModal({ open, onClose }: ModalBaseProps) {
  const { data: dogs } = useDogs();
  const females = (dogs ?? []).filter((d) => d.sex.includes("Bitch"));
  const create = useCreate("dog-heats", "dog-heats");
  const { showToast } = useToast();

  const [dogId, setDogId] = useState("");
  const [date, setDate] = useState(todayISO());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ dogId, date });
      showToast("Heat event logged.");
      setDogId("");
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to log heat event.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Heat Event">
      <form onSubmit={onSubmit}>
        <FormGroup label="Female Dog">
          <Select required value={dogId} onChange={(e) => setDogId(e.target.value)}>
            <option value="" disabled>
              Select a dog…
            </option>
            {females.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Date Start">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending || !dogId}>
            Log
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
