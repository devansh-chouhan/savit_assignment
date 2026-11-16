"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useUser } from "@/components/shell";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/format";
import type { Task, Lead, SessionUser } from "@/types/crm";
import Link from "next/link";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

function TaskForm({
  initial,
  leads,
  users,
  isAdmin,
  currentUserId,
  onSubmit,
  pending,
  onCancel,
}: {
  initial: Partial<Task>;
  leads: Lead[];
  users: SessionUser[];
  isAdmin: boolean;
  currentUserId: string;
  onSubmit: (data: Record<string, unknown>) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [dueDate, setDueDate] = useState(
    initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : ""
  );
  const [leadId, setLeadId] = useState(initial.leadId ?? "");
  const [assignedUserId, setAssignedUserId] = useState(initial.assignedUserId ?? currentUserId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, dueDate, leadId: leadId || null, assignedUserId });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Due date *</label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Associated lead</label>
        <Select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          <option value="">— None —</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </Select>
      </div>
      {isAdmin && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Assigned to</label>
          <Select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

export function TasksView() {
  const user = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [status, setStatus] = useState("open");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const data = await api<{ tasks: Task[] }>(`/api/tasks?${params}`);
    setTasks(data.tasks);
  }

  useEffect(() => {
    api<{ leads: Lead[] }>("/api/leads").then((d) => setLeads(d.leads)).catch(() => {});
    if (user.role === "ADMIN") {
      api<{ users: SessionUser[] }>("/api/users").then((d) => setUsers(d.users)).catch(() => {});
    }
  }, [user.role]);

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function save(data: Record<string, unknown>) {
    setPending(true);
    try {
      if (editing) {
        await api(`/api/tasks/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) });
      } else {
        await api("/api/tasks", { method: "POST", body: JSON.stringify(data) });
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

  async function toggle(task: Task) {
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ completed: !task.completed }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function remove(task: Task) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const isOverdue = (task: Task) => !task.completed && new Date(task.dueDate) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {user.role === "ADMIN" ? "All team tasks." : "Your follow-up tasks."}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>New task</Button>
      </div>

      <div className="flex gap-2">
        {["open", "overdue", "done", ""].map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
            className="capitalize"
          >
            {s === "" ? "All" : s}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 rounded-xl border bg-card p-4 ${task.completed ? "opacity-60" : ""}`}
          >
            <button onClick={() => toggle(task)} className="mt-0.5 shrink-0">
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : isOverdue(task) ? (
                <AlertCircle className="h-5 w-5 text-rose-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.completed ? "line-through" : ""}`}>{task.title}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className={isOverdue(task) ? "text-rose-600 font-medium" : ""}>
                  Due {formatDate(task.dueDate)}
                </span>
                {task.assignedUser && <span>{task.assignedUser.name}</span>}
                {task.lead && (
                  <Link href={`/leads/${task.lead.id}`} className="text-primary hover:underline">
                    {task.lead.title}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="text-xs font-medium text-primary" onClick={() => { setEditing(task); setOpen(true); }}>Edit</button>
              <button className="text-xs font-medium text-rose-600" onClick={() => remove(task)}>Delete</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 ? (
          <div className="rounded-xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No tasks found.
          </div>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            key={editing?.id ?? "new"}
            initial={editing ?? {}}
            leads={leads}
            users={users.length ? users : [{ id: user.id, name: user.name, email: user.email, role: user.role }]}
            isAdmin={user.role === "ADMIN"}
            currentUserId={user.id}
            onSubmit={save}
            pending={pending}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
