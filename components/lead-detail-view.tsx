"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Building2,
  MapPin,
  Tag,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/shell";
import { api } from "@/lib/client";
import { STAGES, STAGE_LABELS, ACTIVITY_LABELS, ACTIVITY_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime, formatINR, fromNow } from "@/lib/format";
import type { LeadDetail, Activity, Task, ScoreResult, EmailDraft, SessionUser } from "@/types/crm";

// ─── Score Widget ───────────────────────────────────────────────────────────

function ScoreWidget({ leadId, stale }: { leadId: string; stale: boolean }) {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<ScoreResult>(`/api/leads/${leadId}/score`, {
          method: "POST",
          body: JSON.stringify({ force }),
        });
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI scoring failed");
      } finally {
        setLoading(false);
      }
    },
    [leadId],
  );

  useEffect(() => {
    score(false);
  }, [score]);

  const catColor = result?.category === "HOT"
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : result?.category === "WARM"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-sky-50 text-sky-700 border-sky-200";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          AI Lead Score
        </CardTitle>
        <button
          onClick={() => score(true)}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {stale && !result?.cached ? "Stale — refresh" : "Refresh"}
        </button>
      </CardHeader>
      <CardContent>
        {loading && !result ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Scoring…
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={result.category === "HOT" ? "#f43f5e" : result.category === "WARM" ? "#f59e0b" : "#0ea5e9"}
                    strokeWidth="3"
                    strokeDasharray={`${result.score} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                  {result.score}
                </span>
              </div>
              <div>
                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${catColor}`}>
                  {result.category}
                </span>
                {result.cached && (
                  <p className="mt-1 text-xs text-muted-foreground">Cached score</p>
                )}
              </div>
            </div>
            <ul className="space-y-1">
              {result.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Email Generator ─────────────────────────────────────────────────────────

function EmailGenerator({ leadId, onSave }: { leadId: string; onSave: (body: string) => void }) {
  const [tone, setTone] = useState<"formal" | "friendly" | "short">("formal");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<EmailDraft>(`/api/leads/${leadId}/email`, {
        method: "POST",
        body: JSON.stringify({ tone }),
      });
      setDraft(data);
      setEditedBody(data.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveAsActivity() {
    setSaving(true);
    try {
      const text = `Subject: ${draft!.subject}\n\n${editedBody}`;
      await onSave(text);
      setDraft(null);
      setEditedBody("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-indigo-500" />
          AI Follow-up Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Select
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            className="w-36"
          >
            <option value="formal">Formal</option>
            <option value="friendly">Friendly</option>
            <option value="short">Short</option>
          </Select>
          <Button onClick={generate} disabled={loading} size="sm">
            {loading ? (
              <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</>
            ) : (
              "Generate AI Email"
            )}
          </Button>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {draft ? (
          <div className="space-y-2">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              Subject: {draft.subject}
            </div>
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={10}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDraft(null)}>Discard</Button>
              <Button size="sm" onClick={saveAsActivity} disabled={saving}>
                {saving ? "Saving…" : "Save as Activity"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

const ACT_ICON: Record<string, string> = {
  CALL: "📞",
  EMAIL: "✉️",
  MEETING: "🤝",
  NOTE: "📝",
  STAGE_CHANGE: "🔄",
};

function ActivityTimeline({
  activities,
  leadId,
  onAdded,
}: {
  activities: Activity[];
  leadId: string;
  onAdded: () => void;
}) {
  const [type, setType] = useState<string>("NOTE");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await api(`/api/leads/${leadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type, description }),
      });
      setDescription("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add activity");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-36 shrink-0">
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
          ))}
        </Select>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a note, call log or meeting summary…"
          required
          minLength={2}
        />
        <Button type="submit" disabled={adding} className="shrink-0">
          {adding ? "Adding…" : "Add"}
        </Button>
      </form>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card text-sm">
              {ACT_ICON[activity.type] ?? "•"}
            </div>
            <div className="flex-1 rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {ACTIVITY_LABELS[activity.type] ?? activity.type}
                  </span>
                  {" · "}
                  <span className="text-xs text-muted-foreground">{activity.createdBy.name}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground" title={formatDateTime(activity.createdAt)}>
                  {fromNow(activity.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{activity.description}</p>
            </div>
          </div>
        ))}
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activities yet.</p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Task Panel ───────────────────────────────────────────────────────────────

function TaskPanel({
  tasks,
  leadId,
  users,
  currentUserId,
  isAdmin,
  onChanged,
}: {
  tasks: Task[];
  leadId: string;
  users: SessionUser[];
  currentUserId: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedUserId, setAssignedUserId] = useState(currentUserId);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title, dueDate, leadId, assignedUserId }),
      });
      setTitle("");
      setDueDate("");
      setShowForm(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(task: Task) {
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: !task.completed }) });
      onChanged();
    } catch {
      /* ignore */
    }
  }

  const isOverdue = (task: Task) => !task.completed && new Date(task.dueDate) < new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">Follow-up Tasks</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShowForm((v) => !v)}>
          <ChevronDown className={`h-4 w-4 transition-transform ${showForm ? "rotate-180" : ""}`} />
          Add task
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {showForm && (
          <form onSubmit={addTask} className="mb-3 space-y-2 rounded-lg border bg-muted/30 p-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required minLength={2} />
            <div className="flex gap-2">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="flex-1" />
              {isAdmin && users.length > 0 && (
                <Select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className="flex-1">
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              )}
            </div>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={adding}>{adding ? "Adding…" : "Add task"}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}
        {tasks.map((task) => (
          <div key={task.id} className={`flex items-center gap-2 rounded-lg border p-2 ${task.completed ? "opacity-60" : ""}`}>
            <button onClick={() => toggle(task)} className="shrink-0">
              {task.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : isOverdue(task) ? (
                <AlertCircle className="h-4 w-4 text-rose-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${task.completed ? "line-through" : ""}`}>{task.title}</p>
              <p className={`text-xs ${isOverdue(task) ? "text-rose-600" : "text-muted-foreground"}`}>
                Due {formatDate(task.dueDate)}
                {task.assignedUser ? ` · ${task.assignedUser.name}` : ""}
              </p>
            </div>
          </div>
        ))}
        {tasks.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Stage Changer ────────────────────────────────────────────────────────────

function StageChanger({ lead, onChanged }: { lead: LeadDetail; onChanged: () => void }) {
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStage(stage: string, reason?: string) {
    setMoving(true);
    setError(null);
    try {
      await api(`/api/leads/${lead.id}/stage`, {
        method: "POST",
        body: JSON.stringify({ stage, lostReason: reason }),
      });
      setLostOpen(false);
      setLostReason("");
      setPendingStage(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage");
    } finally {
      setMoving(false);
    }
  }

  function requestStage(stage: string) {
    if (stage === "LOST") {
      setPendingStage(stage);
      setLostOpen(true);
    } else {
      changeStage(stage);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => requestStage(s)}
            disabled={s === lead.stage || moving}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              s === lead.stage
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-border bg-card text-muted-foreground hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}

      <Dialog open={lostOpen} onOpenChange={(v) => !v && setLostOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Why was this lead lost?</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); if (pendingStage) changeStage(pendingStage, lostReason); }}
            className="space-y-3"
          >
            <Input
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Budget, competitor, no response…"
              minLength={3}
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLostOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={moving}>{moving ? "Saving…" : "Mark lost"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Lead Detail View ────────────────────────────────────────────────────

export function LeadDetailView({ id }: { id: string }) {
  const user = useUser();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ lead: LeadDetail }>(`/api/leads/${id}`);
      setLead(data.lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    }
  }, [id]);

  useEffect(() => {
    load();
    if (user.role === "ADMIN") {
      api<{ users: SessionUser[] }>("/api/users").then((d) => setUsers(d.users)).catch(() => {});
    }
  }, [load, user.role]);

  async function saveEmailAsActivity(body: string) {
    await api(`/api/leads/${id}/activities`, {
      method: "POST",
      body: JSON.stringify({ type: "EMAIL", description: body }),
    });
    await load();
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Leads
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{lead.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge tone={lead.stage}>{STAGE_LABELS[lead.stage]}</Badge>
              <span>·</span>
              <span>{formatINR(lead.dealValue)}</span>
              <span>·</span>
              <span>{lead.owner.name}</span>
              {lead.source && <><span>·</span><span>{lead.source}</span></>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Stage selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pipeline Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <StageChanger lead={lead} onChanged={load} />
              {lead.stage === "LOST" && lead.lostReason && (
                <p className="mt-2 text-xs text-muted-foreground">Lost reason: {lead.lostReason}</p>
              )}
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={lead.activities} leadId={id} onAdded={load} />
            </CardContent>
          </Card>

          {/* Email generator */}
          <EmailGenerator leadId={id} onSave={saveEmailAsActivity} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI Score */}
          <ScoreWidget leadId={id} stale={lead.scoreStale} />

          {/* Lead info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Close date" value={formatDate(lead.expectedCloseDate)} />
              <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Source" value={lead.source ?? "—"} />
              <InfoRow label="Created" value={formatDate(lead.createdAt)} />
              <InfoRow label="Updated" value={fromNow(lead.updatedAt)} />
            </CardContent>
          </Card>

          {/* Contact info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{lead.contact.name}</p>
              {lead.contact.email && (
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="" value={lead.contact.email} />
              )}
              {lead.contact.phone && (
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="" value={lead.contact.phone} />
              )}
              {lead.contact.company && (
                <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="" value={lead.contact.company.name} />
              )}
              {lead.contact.city && (
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="" value={lead.contact.city} />
              )}
              {lead.contact.tags && lead.contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {lead.contact.tags.map((t) => (
                    <span key={t} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <TaskPanel
            tasks={lead.tasks}
            leadId={id}
            users={users.length ? users : [{ id: user.id, name: user.name, email: user.email, role: user.role }]}
            currentUserId={user.id}
            isAdmin={user.role === "ADMIN"}
            onChanged={load}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      {label && <span className="shrink-0 text-muted-foreground">{label}:</span>}
      <span className="truncate">{value}</span>
    </div>
  );
}
