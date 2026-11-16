"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/client";
import { SOURCES, CITIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Contact, Company } from "@/types/crm";
import Link from "next/link";

type Facets = { cities: string[]; sources: string[]; tags: string[] };

function ContactForm({
  initial,
  companies,
  onSubmit,
  pending,
  onCancel,
}: {
  initial: Partial<Contact> & { companyId?: string | null };
  companies: Company[];
  onSubmit: (data: Record<string, unknown>) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [companyId, setCompanyId] = useState(initial.companyId ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [source, setSource] = useState(initial.source ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [tagsRaw, setTagsRaw] = useState((initial.tags ?? []).join(", "));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ name, email: email || null, phone: phone || null, companyId: companyId || null, city: city || null, source: source || null, notes: notes || null, tags });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Company</label>
          <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">— None —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
          <Select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">—</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Source</label>
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">—</option>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
          <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Decision maker, Enterprise" />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [facets, setFacets] = useState<Facets>({ cities: [], sources: [], tags: [] });
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (source) params.set("source", source);
    if (tag) params.set("tag", tag);
    const data = await api<{ contacts: Contact[]; facets: Facets }>(`/api/contacts?${params}`);
    setContacts(data.contacts);
    setFacets(data.facets);
  }

  useEffect(() => {
    api<{ companies: Company[] }>("/api/companies").then((d) => setCompanies(d.companies)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load().catch((err: Error) => setError(err.message)), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, source, tag]);

  async function save(data: Record<string, unknown>) {
    setPending(true);
    try {
      if (editing) {
        await api(`/api/contacts/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) });
      } else {
        await api("/api/contacts", { method: "POST", body: JSON.stringify(data) });
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setPending(false);
    }
  }

  async function remove(contact: Contact) {
    if (!confirm(`Delete ${contact.name}?`)) return;
    try {
      await api(`/api/contacts/${contact.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Contacts</h2>
          <p className="text-sm text-muted-foreground">{contacts.length} contacts in the CRM.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/contacts/import">
            <Button variant="outline">Import CSV</Button>
          </Link>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>New contact</Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Search name, email, company…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {facets.cities.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {facets.sources.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {facets.tags.map((t) => <option key={t}>{t}</option>)}
        </Select>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Company</th>
              <th className="px-3 py-3 font-medium">City</th>
              <th className="px-3 py-3 font-medium">Tags</th>
              <th className="px-3 py-3 font-medium">Added</th>
              <th className="px-3 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-3 font-medium">{contact.name}</td>
                <td className="px-3 py-3 text-muted-foreground">{contact.email ?? "—"}</td>
                <td className="px-3 py-3 text-muted-foreground">{contact.phone ?? "—"}</td>
                <td className="px-3 py-3">{contact.company?.name ?? "—"}</td>
                <td className="px-3 py-3">{contact.city ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.slice(0, 2).map((t) => (
                      <Badge key={t} tone="NEW" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{formatDate(contact.createdAt)}</td>
                <td className="px-3 py-3 text-right">
                  <button className="mr-3 text-xs font-medium text-primary" onClick={() => { setEditing(contact); setOpen(true); }}>Edit</button>
                  <button className="text-xs font-medium text-rose-600" onClick={() => remove(contact)}>Delete</button>
                </td>
              </tr>
            ))}
            {contacts.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">No contacts found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
          </DialogHeader>
          <ContactForm
            key={editing?.id ?? "new"}
            initial={editing ?? {}}
            companies={companies}
            onSubmit={save}
            pending={pending}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
