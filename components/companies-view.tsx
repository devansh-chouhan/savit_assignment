"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/client";
import { CITIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Company } from "@/types/crm";

const INDUSTRIES = ["IT Services", "Banking", "Retail", "E-commerce", "Fintech", "Food Tech", "Logistics", "Manufacturing", "Pharmaceuticals", "Financial Services", "Other"];

function CompanyForm({
  initial,
  onSubmit,
  pending,
  onCancel,
}: {
  initial: Partial<Company>;
  onSubmit: (data: Record<string, unknown>) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [industry, setIndustry] = useState(initial.industry ?? "");
  const [city, setCity] = useState(initial.city ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, website: website || null, industry: industry || null, city: city || null });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Company name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Website</label>
          <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Industry</label>
          <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">—</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
          <Select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">—</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function CompaniesView() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const data = await api<{ companies: Company[] }>(`/api/companies?${params}`);
    setCompanies(data.companies);
  }

  useEffect(() => {
    const t = setTimeout(() => load().catch((err: Error) => setError(err.message)), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function save(data: Record<string, unknown>) {
    setPending(true);
    try {
      if (editing) {
        await api(`/api/companies/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) });
      } else {
        await api("/api/companies", { method: "POST", body: JSON.stringify(data) });
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

  async function remove(company: Company) {
    if (!confirm(`Delete ${company.name}? This will unlink all contacts.`)) return;
    try {
      await api(`/api/companies/${company.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Companies</h2>
          <p className="text-sm text-muted-foreground">{companies.length} companies in the CRM.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>New company</Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Search companies…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Industry</th>
              <th className="px-3 py-3 font-medium">City</th>
              <th className="px-3 py-3 font-medium">Website</th>
              <th className="px-3 py-3 font-medium">Contacts</th>
              <th className="px-3 py-3 font-medium">Added</th>
              <th className="px-3 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-3 font-medium">{company.name}</td>
                <td className="px-3 py-3 text-muted-foreground">{company.industry ?? "—"}</td>
                <td className="px-3 py-3">{company.city ?? "—"}</td>
                <td className="px-3 py-3">
                  {company.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-3 py-3">{company._count?.contacts ?? 0}</td>
                <td className="px-3 py-3 text-muted-foreground">{formatDate(company.createdAt)}</td>
                <td className="px-3 py-3 text-right">
                  <button className="mr-3 text-xs font-medium text-primary" onClick={() => { setEditing(company); setOpen(true); }}>Edit</button>
                  <button className="text-xs font-medium text-rose-600" onClick={() => remove(company)}>Delete</button>
                </td>
              </tr>
            ))}
            {companies.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No companies found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit company" : "New company"}</DialogTitle>
          </DialogHeader>
          <CompanyForm
            key={editing?.id ?? "new"}
            initial={editing ?? {}}
            onSubmit={save}
            pending={pending}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
