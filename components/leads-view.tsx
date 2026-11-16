"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/components/kanban-board";
import { LeadForm, emptyLeadForm, leadToForm, type LeadFormValue } from "@/components/lead-form";
import { useUser } from "@/components/shell";
import { api } from "@/lib/client";
import { SOURCES, STAGE_LABELS, STAGES, type Stage } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/format";
import type { Contact, Lead, SessionUser } from "@/types/crm";

export function LeadsView() {
  const user = useUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [mode, setMode] = useState<"board" | "table">("board");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [pending, setPending] = useState(false);
  const [lost, setLost] = useState<{ lead: Lead; reason: string } | null>(null);

  async function loadLeads(query = q) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (stage) params.set("stage", stage);
    if (source) params.set("source", source);
    if (ownerId) params.set("ownerId", ownerId);
    const data = await api<{ leads: Lead[] }>(`/api/leads?${params.toString()}`);
    setLeads(data.leads);
  }

  useEffect(() => {
    api<{ contacts: Contact[] }>("/api/contacts").then((data) => setContacts(data.contacts)).catch((err: Error) => setError(err.message));
    api<{ users: SessionUser[] }>("/api/users").then((data) => setUsers(data.users)).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads().catch((err: Error) => setError(err.message));
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, stage, source, ownerId]);

  async function save(form: LeadFormValue) {
    setPending(true);
    try {
      const payload = {
        title: form.title,
        contactId: form.contactId,
        dealValue: Number(form.dealValue),
        stage: form.stage,
        ownerId: form.ownerId,
        expectedCloseDate: form.expectedCloseDate || null,
        source: form.source || null,
        lostReason: form.stage === "LOST" ? form.lostReason : null,
      };
      if (editing) {
        await api(`/api/leads/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/leads", { method: "POST", body: JSON.stringify(payload) });
      }
      setOpen(false);
      setEditing(null);
      await loadLeads();
    } finally {
      setPending(false);
    }
  }

  async function move(lead: Lead, next: Stage, lostReason?: string) {
    setError(null);
    if (next === "LOST" && !lostReason) {
      setLost({ lead, reason: "" });
      return;
    }
    try {
      await api(`/api/leads/${lead.id}/stage`, {
        method: "POST",
        body: JSON.stringify({ stage: next, lostReason }),
      });
      setLost(null);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the lead");
    }
  }

  async function remove(lead: Lead) {
    if (!confirm(`Delete ${lead.title}?`)) return;
    await api(`/api/leads/${lead.id}`, { method: "DELETE" });
    await loadLeads();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">
            {user.role === "ADMIN" ? "Every lead in the pipeline." : "Leads assigned to you."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === "board" ? "default" : "outline"} onClick={() => setMode("board")}>
            Board
          </Button>
          <Button variant={mode === "table" ? "default" : "outline"} onClick={() => setMode("table")}>
            Table
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New lead
          </Button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Search title, contact, company" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {STAGES.map((item) => (
            <option key={item} value={item}>
              {STAGE_LABELS[item]}
            </option>
          ))}
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {SOURCES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        {user.role === "ADMIN" ? (
          <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">All owners</option>
            {users.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </Select>
        ) : (
          <div />
        )}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {mode === "board" ? (
        <KanbanBoard leads={leads} onMove={(lead, next) => move(lead, next)} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">Lead</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Value</th>
                <th className="px-3 py-3 font-medium">Stage</th>
                <th className="px-3 py-3 font-medium">Owner</th>
                <th className="px-3 py-3 font-medium">Close</th>
                <th className="px-3 py-3 font-medium">Score</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{lead.source}</p>
                  </td>
                  <td className="px-3 py-3">
                    {lead.contact.name}
                    <p className="text-xs text-muted-foreground">{lead.contact.company?.name}</p>
                  </td>
                  <td className="px-3 py-3">{formatINR(lead.dealValue)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={lead.stage}>{STAGE_LABELS[lead.stage]}</Badge>
                  </td>
                  <td className="px-3 py-3">{lead.owner.name}</td>
                  <td className="px-3 py-3">{formatDate(lead.expectedCloseDate)}</td>
                  <td className="px-3 py-3">{lead.aiScore ?? "—"}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      className="mr-3 text-xs font-medium text-primary"
                      onClick={() => {
                        setEditing(lead);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-xs font-medium text-rose-600" onClick={() => remove(lead)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit lead" : "New lead"}</DialogTitle>
          </DialogHeader>
          <LeadForm
            key={editing?.id ?? "new"}
            initial={editing ? leadToForm(editing) : emptyLeadForm(user.id)}
            contacts={contacts}
            users={users}
            isAdmin={user.role === "ADMIN"}
            pending={pending}
            onSubmit={save}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(lost)} onOpenChange={(next) => !next && setLost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why was this lead lost?</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (lost) move(lost.lead, "LOST", lost.reason);
            }}
          >
            <Input
              value={lost?.reason ?? ""}
              onChange={(e) => setLost((current) => (current ? { ...current, reason: e.target.value } : current))}
              placeholder="Budget, competitor, no response…"
              minLength={3}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLost(null)}>
                Cancel
              </Button>
              <Button type="submit">Mark lost</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
