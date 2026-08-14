"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormGroup, TextInput, Select, TextArea, InputRow, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { todayISO, POULTRY_BREEDS, type PoultryBreed } from "@/lib/constants";
import { googleSearch, googleLens } from "@/lib/google-diagnostics";
import { uploadHealthPhoto } from "@/lib/supabase/storage";
import { useCreate, usePoultryBatches, useProfile } from "../use-ravia-data";

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

export function DeployPoultryBatchModal({ open, onClose }: ModalBaseProps) {
  // Also invalidates "finance": the deploy writes the purchase expense too.
  const create = useCreate("poultry", "poultry", ["finance"]);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    breed: "Sasso" as PoultryBreed,
    source: "",
    count: 50,
    unitPrice: 110,
    date: todayISO(),
  });

  function reset() {
    setForm({ name: "", breed: "Sasso", source: "", count: 50, unitPrice: 110, date: todayISO() });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      showToast("Batch deployed and expense recorded.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to deploy batch.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Deploy Poultry Batch">
      <form onSubmit={onSubmit}>
        <FormGroup label="Batch Name/ID">
          <TextInput
            required
            placeholder="Batch 001"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormGroup>
        <FormGroup label="Breed Type">
          <Select value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value as typeof form.breed })}>
            {POULTRY_BREEDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Source / Supplier">
          <TextInput
            required
            placeholder="Silverlands"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
        </FormGroup>
        <InputRow>
          <FormGroup label="Number of Birds (Qty)">
            <TextInput
              type="number"
              min={1}
              value={form.count}
              onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
            />
          </FormGroup>
          <FormGroup label="Unit Price (KES per bird)">
            <TextInput
              type="number"
              min={0}
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
            />
          </FormGroup>
        </InputRow>
        <FormGroup label="Date Deployed">
          <TextInput
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="deploy" disabled={create.isPending}>
            Deploy &amp; Log Expense
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function EggCollectionModal({ open, onClose }: ModalBaseProps) {
  // Eggs laid feed straight into egg_stock's on-hand balance.
  const create = useCreate("eggs", "eggs", ["egg-stock"]);
  const { showToast } = useToast();
  const [count, setCount] = useState(0);
  const [date, setDate] = useState(todayISO());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ count, date });
      showToast("Egg collection saved.");
      setCount(0);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Egg Collection">
      <form onSubmit={onSubmit}>
        <FormGroup label="Quantity Collected">
          <TextInput type="number" required min={0} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </FormGroup>
        <FormGroup label="Date">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            Save
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function NewIncubationModal({ open, onClose }: ModalBaseProps) {
  // Setting eggs draws down egg_stock's on-hand balance the same way a sale does.
  const create = useCreate("incubations", "incubations", ["egg-stock"]);
  const { showToast } = useToast();
  const [count, setCount] = useState(0);
  const [date, setDate] = useState(todayISO());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ count, date });
      showToast("Incubation cycle started.");
      setCount(0);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Incubation">
      <form onSubmit={onSubmit}>
        <FormGroup label="Eggs Set">
          <TextInput type="number" required min={0} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </FormGroup>
        <FormGroup label="Date Start">
          <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            Start
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

const POULTRY_ISSUES = ["Gumboro (IBD)", "Newcastle (NCD)", "Coccidiosis", "Fowl Pox", "CRD", "Other"];

export function PoultryHealthModal({ open, onClose }: ModalBaseProps) {
  const { data: batches } = usePoultryBatches();
  const { data: profile } = useProfile();
  // Mortality feeds straight into poultry_stock's on-hand balance for the batch.
  const create = useCreate("poultry-health", "poultry-health", ["poultry"]);
  const { showToast } = useToast();

  const [batchId, setBatchId] = useState("");
  const [issue, setIssue] = useState(POULTRY_ISSUES[0]);
  const [otherIssue, setOtherIssue] = useState("");
  const [affected, setAffected] = useState(0);
  const [mortality, setMortality] = useState(0);
  const [rx, setRx] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const resolvedIssue = issue === "Other" ? otherIssue : issue;
  const batchLabel =
    batchId === "" ? "Layers" : batches?.find((b) => b.id === batchId)?.name ?? "Layers";

  function reset() {
    setBatchId("");
    setIssue(POULTRY_ISSUES[0]);
    setOtherIssue("");
    setAffected(0);
    setMortality(0);
    setRx("");
    setPhotoUrl(undefined);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      setPhotoUrl(await uploadHealthPhoto(file, profile.farm_id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        batchId: batchId || undefined,
        batch: batchLabel,
        issue: resolvedIssue,
        affected,
        mortality,
        rx,
        photoUrl,
      });
      showToast("Incident logged.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to log incident.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Poultry Health & Mortality">
      <form onSubmit={onSubmit}>
        <FormGroup label="Source Batch">
          <Select required value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Layers (General)</option>
            {(batches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.count} birds)
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Known Disease/Condition">
          <Select value={issue} onChange={(e) => setIssue(e.target.value)}>
            {POULTRY_ISSUES.map((i) => (
              <option key={i} value={i}>
                {i === "Other" ? "Other (Specify Below)" : i}
              </option>
            ))}
          </Select>
        </FormGroup>
        {issue === "Other" ? (
          <FormGroup label="Specify Other">
            <TextInput value={otherIssue} onChange={(e) => setOtherIssue(e.target.value)} />
          </FormGroup>
        ) : null}
        <InputRow>
          <FormGroup label="Number Affected">
            <TextInput
              type="number"
              min={0}
              value={affected}
              onChange={(e) => setAffected(Number(e.target.value))}
            />
          </FormGroup>
          <FormGroup label="Mortality (Deaths)">
            <TextInput
              type="number"
              min={0}
              value={mortality}
              onChange={(e) => setMortality(Number(e.target.value))}
            />
          </FormGroup>
        </InputRow>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => googleSearch("Poultry Bird", resolvedIssue)}>
            <i className="fas fa-search" /> Search Symptoms
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={googleLens}>
            <i className="fas fa-camera" /> Visual ID
          </Button>
        </div>
        <FormGroup label="Photo Proof">
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="text-sm text-muted" />
          {uploading ? <p className="text-muted text-xs mt-1">Uploading…</p> : null}
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Health evidence" className="w-24 h-24 object-cover rounded-lg mt-2 border border-hairline" />
          ) : null}
        </FormGroup>
        <FormGroup label="Treatment Applied">
          <TextArea rows={3} value={rx} onChange={(e) => setRx(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={create.isPending || uploading}>
            Log Incident
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
