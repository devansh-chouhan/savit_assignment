"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/client";
import { Upload, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const CRM_FIELDS = [
  { key: "name", label: "Name *" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
  { key: "tags", label: "Tags (comma-sep)" },
  { key: "", label: "— Skip column —" },
];

type ParsedRow = Record<string, string>;
type ImportResult = { imported: number; skipped: number; failed: number; errors: string[] };

export function ImportView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        if (!parsed.data.length) { setError("The CSV file is empty."); return; }
        const hdrs = parsed.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(parsed.data as ParsedRow[]);
        // Auto-map by matching header names (case-insensitive)
        const auto: Record<string, string> = {};
        for (const h of hdrs) {
          const lower = h.toLowerCase().trim();
          const match = CRM_FIELDS.find(
            (f) => f.key && (f.key === lower || f.label.toLowerCase().startsWith(lower))
          );
          auto[h] = match?.key ?? "";
        }
        setMapping(auto);
        setStep("map");
      },
      error: (err) => setError(err.message),
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function buildMappedRows() {
    return rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (field) out[field] = row[header] ?? "";
      }
      return out;
    });
  }

  async function runImport() {
    setImporting(true);
    setError(null);
    try {
      const mappedRows = buildMappedRows();
      const data = await api<ImportResult>("/api/import/contacts", {
        method: "POST",
        body: JSON.stringify({ rows: mappedRows, skipDuplicates }),
      });
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setStep("upload");
    setError(null);
  }

  const preview = buildMappedRows().slice(0, 5);
  const mappedFields = Object.values(mapping).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Contacts
        </Link>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Import Contacts from CSV</h2>
        <p className="text-sm text-muted-foreground">
          Upload a CSV, map columns to CRM fields, preview and import.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-muted/20 p-12"
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Drop a CSV file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <Button onClick={() => fileRef.current?.click()}>Choose file</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <a
            href="/sample-contacts.csv"
            className="text-xs text-primary hover:underline"
            download
          >
            Download sample CSV
          </a>
        </div>
      )}

      {/* Step 2: Column mapping */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <p className="font-medium text-sm">Map CSV columns to CRM fields</p>
              <p className="text-xs text-muted-foreground">{rows.length} rows found · {headers.length} columns</p>
            </div>
            <div className="divide-y">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-4 px-4 py-3">
                  <span className="w-48 shrink-0 text-sm font-medium truncate" title={header}>{header}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={mapping[header] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                    className="flex-1"
                  >
                    {CRM_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </Select>
                  <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                    e.g. {rows[0]?.[header] ?? ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="h-4 w-4"
            />
            Skip rows where email or phone already exists in CRM
          </label>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button
              onClick={() => setStep("preview")}
              disabled={!mappedFields.includes("name")}
            >
              Preview import
            </Button>
          </div>
          {!mappedFields.includes("name") && (
            <p className="text-xs text-amber-600">Map at least the &quot;Name&quot; column to continue.</p>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card overflow-x-auto">
            <div className="border-b px-4 py-3">
              <p className="font-medium text-sm">Preview (first 5 rows of {rows.length})</p>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  {CRM_FIELDS.filter((f) => f.key && mappedFields.includes(f.key)).map((f) => (
                    <th key={f.key} className="px-3 py-2 text-left font-medium">{f.label.replace(" *", "")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {CRM_FIELDS.filter((f) => f.key && mappedFields.includes(f.key)).map((f) => (
                      <td key={f.key} className="px-3 py-2 max-w-[160px] truncate">{row[f.key] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
            <Button onClick={runImport} disabled={importing}>
              {importing ? "Importing…" : `Import ${rows.length} rows`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 text-lg font-semibold">Import complete</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-2xl font-bold text-emerald-700">{result.imported}</p>
                <p className="text-xs text-emerald-600">Imported</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                <p className="text-xs text-amber-600">Skipped (duplicates)</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-2xl font-bold text-rose-700">{result.failed}</p>
                <p className="text-xs text-rose-600">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  {result.errors.length} error(s)
                </summary>
                <ul className="mt-2 space-y-1">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i} className="text-xs text-rose-600">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>Import another file</Button>
            <Link href="/contacts"><Button>Go to contacts</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
