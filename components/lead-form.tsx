"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SOURCES, STAGE_LABELS, STAGES } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import type { Contact, Lead, SessionUser } from "@/types/crm";

export type LeadFormValue = {
  title: string;
  contactId: string;
  dealValue: string;
  stage: string;
  ownerId: string;
  expectedCloseDate: string;
  source: string;
  lostReason: string;
};

export function emptyLeadForm(ownerId = ""): LeadFormValue {
  return {
    title: "",
    contactId: "",
    dealValue: "",
    stage: "NEW",
    ownerId,
    expectedCloseDate: "",
    source: "Website",
    lostReason: "",
  };
}

export function leadToForm(lead: Lead): LeadFormValue {
  return {
    title: lead.title,
    contactId: lead.contactId,
    dealValue: String(lead.dealValue),
    stage: lead.stage,
    ownerId: lead.ownerId,
    expectedCloseDate: toDateInput(lead.expectedCloseDate),
    source: lead.source ?? "",
    lostReason: lead.lostReason ?? "",
  };
}

export function LeadForm({
  initial,
  contacts,
  users,
  isAdmin,
  pending,
  onSubmit,
}: {
  initial: LeadFormValue;
  contacts: Contact[];
  users: SessionUser[];
  isAdmin: boolean;
  pending: boolean;
  onSubmit: (value: LeadFormValue) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof LeadFormValue>(key: K, value: LeadFormValue[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        try {
          await onSubmit(form);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save the lead");
        }
      }}
    >
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Contact</Label>
          <Select value={form.contactId} onChange={(e) => set("contactId", e.target.value)} required>
            <option value="">Select contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.company ? ` · ${contact.company.name}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Deal value (INR)</Label>
          <Input type="number" min={1} value={form.dealValue} onChange={(e) => set("dealValue", e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Select value={form.stage} onChange={(e) => set("stage", e.target.value)}>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Select value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)} disabled={!isAdmin}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Expected close</Label>
          <Input type="date" value={form.expectedCloseDate} onChange={(e) => set("expectedCloseDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={form.source} onChange={(e) => set("source", e.target.value)}>
            <option value="">Unknown</option>
            {SOURCES.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </Select>
        </div>
      </div>
      {form.stage === "LOST" ? (
        <div className="space-y-1.5">
          <Label>Lost reason</Label>
          <Input value={form.lostReason} onChange={(e) => set("lostReason", e.target.value)} required minLength={3} />
        </div>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button disabled={pending}>{pending ? "Saving…" : "Save lead"}</Button>
    </form>
  );
}
