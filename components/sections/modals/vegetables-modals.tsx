"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormGroup, TextInput, Select, TextArea, InputRow, CalcPreview, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { todayISO, STEMS_PER_UNIT, formatKES } from "@/lib/constants";
import { googleSearch, googleLens } from "@/lib/google-diagnostics";
import { uploadHealthPhoto } from "@/lib/supabase/storage";
import { useCreate, useVegetableUnits, useProfile } from "../use-ravia-data";

interface ModalBaseProps {
  open: boolean;
  onClose: () => void;
}

const CROPS = ["Sukuma Wiki", "Spinach", "Managu", "Kienyeji Mix"] as const;

export function DeployVegetableUnitsModal({ open, onClose }: ModalBaseProps) {
  // Also invalidates "finance": the deploy writes the purchase expense too.
  const create = useCreate("vegetables", "vegetables", ["finance"]);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    type: "Sukuma Wiki" as (typeof CROPS)[number],
    source: "",
    units: 1,
    pricePerStem: 5,
    date: todayISO(),
  });

  const totalStems = form.units * STEMS_PER_UNIT;
  const totalCost = totalStems * form.pricePerStem;

  function reset() {
    setForm({ type: "Sukuma Wiki", source: "", units: 1, pricePerStem: 5, date: todayISO() });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ type: form.type, source: form.source, units: form.units, pricePerStem: form.pricePerStem, date: form.date });
      showToast("Units deployed and expense recorded.");
      reset();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to deploy units.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Deploy Vertical Units">
      <form onSubmit={onSubmit}>
        <FormGroup label="Crop Type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
            {CROPS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Source / Supplier">
          <TextInput required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </FormGroup>
        <InputRow>
          <FormGroup label="Vertical Units (Qty)">
            <TextInput
              type="number"
              min={1}
              value={form.units}
              onChange={(e) => setForm({ ...form, units: Number(e.target.value) })}
            />
          </FormGroup>
          <FormGroup label="Price per Stem (KES)">
            <TextInput
              type="number"
              min={0}
              step="0.1"
              value={form.pricePerStem}
              onChange={(e) => setForm({ ...form, pricePerStem: Number(e.target.value) })}
            />
          </FormGroup>
        </InputRow>
        <CalcPreview tone="primary">
          Total Stems: <span>{totalStems.toLocaleString()}</span> ({STEMS_PER_UNIT}/unit)
          <br />
          Est. Deployment Cost: <span>{formatKES(totalCost)}</span> KES
        </CalcPreview>
        <FormGroup label="Date Deployed">
          <TextInput type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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

const VEG_ISSUES = ["Downy Mildew", "Aphids", "Bacterial Wilt", "Early Blight", "Spider Mites", "Other"];

export function VegetableHealthModal({ open, onClose }: ModalBaseProps) {
  const { data: units } = useVegetableUnits();
  const { data: profile } = useProfile();
  // Loss feeds straight into vegetable_stock's on-hand balance for the unit.
  const create = useCreate("vegetable-health", "vegetable-health", ["vegetables"]);
  const { showToast } = useToast();

  const [unitId, setUnitId] = useState("");
  const [issue, setIssue] = useState(VEG_ISSUES[0]);
  const [otherIssue, setOtherIssue] = useState("");
  const [affected, setAffected] = useState(0);
  const [loss, setLoss] = useState(0);
  const [rx, setRx] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const resolvedIssue = issue === "Other" ? otherIssue : issue;
  const selectedUnit = units?.find((u) => u.id === unitId);

  function reset() {
    setUnitId("");
    setIssue(VEG_ISSUES[0]);
    setOtherIssue("");
    setAffected(0);
    setLoss(0);
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
    if (!selectedUnit) return;
    try {
      await create.mutateAsync({
        unitId,
        batch: `${selectedUnit.crop_type} (${selectedUnit.units} units)`,
        issue: resolvedIssue,
        affected,
        loss,
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
    <Modal open={open} onClose={onClose} title="Vegetable Health & Loss">
      <form onSubmit={onSubmit}>
        <FormGroup label="Target Batch/Unit">
          <Select required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="" disabled>
              Select a unit…
            </option>
            {(units ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.crop_type} ({u.units} units)
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Pest/Disease">
          <Select value={issue} onChange={(e) => setIssue(e.target.value)}>
            {VEG_ISSUES.map((i) => (
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
          <FormGroup label="Units Affected">
            <TextInput type="number" min={0} value={affected} onChange={(e) => setAffected(Number(e.target.value))} />
          </FormGroup>
          <FormGroup label="Loss (Dead Units)">
            <TextInput type="number" min={0} value={loss} onChange={(e) => setLoss(Number(e.target.value))} />
          </FormGroup>
        </InputRow>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => googleSearch("Vertical Vegetable Crop", resolvedIssue)}>
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
        <FormGroup label="Action/Outcome">
          <TextArea rows={3} value={rx} onChange={(e) => setRx(e.target.value)} />
        </FormGroup>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={create.isPending || uploading || !selectedUnit}>
            Log Incident
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
