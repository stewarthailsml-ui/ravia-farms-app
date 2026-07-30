"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Column } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { Modal } from "@/components/ui/modal";
import { FormGroup, TextInput, Select, ModalActions } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Role } from "@/lib/api-client";
import { useStaff, useInviteStaff, useUpdateStaff, StaffMember, useProfile } from "./use-ravia-data";

const ROLES: Role[] = ["OWNER", "MANAGER", "FARM_HAND", "VET"];
const ADMIN_ROLES: Role[] = ["OWNER", "MANAGER"];

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteStaff();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("FARM_HAND");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await invite.mutateAsync({ email, name: name || undefined, role });
      showToast(`Invite sent to ${email}.`);
      setEmail("");
      setName("");
      setRole("FARM_HAND");
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to send invite.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Staff">
      <form onSubmit={onSubmit}>
        <FormGroup label="Email">
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormGroup>
        <FormGroup label="Name (optional)">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </FormGroup>
        <FormGroup label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </Select>
        </FormGroup>
        <p className="text-muted text-xs mb-4">
          They&apos;ll receive an email invite to join <strong>this farm</strong> at the role selected above.
        </p>
        <ModalActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={invite.isPending}>
            Send Invite
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function StaffView() {
  const { data: staff } = useStaff();
  const { data: me } = useProfile();
  const update = useUpdateStaff();
  const { showToast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  function onRoleChange(member: StaffMember, role: Role) {
    update.mutate(
      { userId: member.id, role },
      {
        onSuccess: () => showToast(`${member.email} is now ${role.replace("_", " ")}.`),
        onError: (e) => showToast(e instanceof Error ? e.message : "Failed to update role."),
      },
    );
  }

  function onDeactivate(member: StaffMember) {
    if (!window.confirm(`Deactivate ${member.email}? They will lose access; their records stay intact.`)) return;
    update.mutate(
      { userId: member.id, deactivate: true },
      {
        onSuccess: () => showToast(`${member.email} deactivated.`),
        onError: (e) => showToast(e instanceof Error ? e.message : "Failed to deactivate."),
      },
    );
  }

  const columns: Column<StaffMember>[] = [
    { key: "email", header: "Email", render: (m) => <strong>{m.email}</strong> },
    { key: "name", header: "Name", render: (m) => m.name ?? "—" },
    {
      key: "role",
      header: "Role",
      render: (m) =>
        m.id === me?.id ? (
          <Tag tone={ADMIN_ROLES.includes(m.role) ? "success" : "neutral"}>{m.role.replace("_", " ")}</Tag>
        ) : (
          <Select
            value={m.role}
            disabled={update.isPending}
            onChange={(e) => onRoleChange(m, e.target.value as Role)}
            className="!w-auto !p-2 text-xs"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </Select>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (m) => <Tag tone={m.archived_at ? "danger" : "success"}>{m.archived_at ? "Deactivated" : "Active"}</Tag>,
    },
    {
      key: "action",
      header: "",
      render: (m) =>
        m.id === me?.id || m.archived_at ? null : (
          <Button variant="outline" size="sm" onClick={() => onDeactivate(m)}>
            Deactivate
          </Button>
        ),
    },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy" onClick={() => setInviteOpen(true)}>
            <i className="fas fa-user-plus" /> Invite Staff
          </Button>
        }
      >
        Staff
      </SectionHeader>

      <Card>
        <p className="text-muted text-sm mb-4">
          Owners and Managers can create, edit, and archive records, and manage staff. Farm Hands and Vets can
          create and edit records but cannot archive them or see archived history.
        </p>
        <Table columns={columns} rows={staff ?? []} emptyMessage="No staff yet." />
      </Card>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
