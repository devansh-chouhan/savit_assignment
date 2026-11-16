"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useUser } from "@/components/shell";
import { stageLabel } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/format";
import { api } from "@/lib/client";
import type { Task } from "@/types/crm";

type DashboardResponse = {
  totals: {
    leads: number;
    pipelineValue: number;
    wonDeals: number;
    winRate: number;
    overdueTasks: number;
  };
  byStage: { stage: string; count: number; value: number }[];
  bySource: { source: string; count: number }[];
  leaderboard: { userId: string; name: string; wonValue: number; wonCount: number; pipelineValue: number }[];
  overdue: Task[];
  reps: { id: string; name: string; role: string }[];
};

const COLORS = ["#4f46e5", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f97316", "#10b981", "#f43f5e"];

function compactINR(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return formatINR(value);
}

export function DashboardView() {
  const user = useUser();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (ownerId) params.set("ownerId", ownerId);
    api<DashboardResponse>(`/api/dashboard?${params.toString()}`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [from, to, ownerId]);

  const cards = data
    ? [
        ["Total leads", String(data.totals.leads)],
        ["Pipeline value", formatINR(data.totals.pipelineValue)],
        ["Won deals", String(data.totals.wonDeals)],
        ["Win rate", `${data.totals.winRate}%`],
        ["Overdue follow-ups", String(data.totals.overdueTasks)],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Pipeline overview</h2>
          <p className="text-sm text-muted-foreground">Live numbers from the CRM database.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm" />
          {user.role === "ADMIN" ? (
            <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-44">
              <option value="">All reps</option>
              {data?.reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline value by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data?.byStage ?? []).map((row) => ({ ...row, label: stageLabel(row.stage) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} height={60} textAnchor="end" />
                <YAxis tickFormatter={(value) => compactINR(Number(value))} width={70} />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leads by source</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.bySource ?? []} dataKey="count" nameKey="source" innerRadius={55} outerRadius={85}>
                  {(data?.bySource ?? []).map((entry, index) => (
                    <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales rep leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.leaderboard ?? []} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => compactINR(Number(value))} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatINR(Number(value))} />
                  <Bar dataKey="wonValue" name="Won value" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 divide-y text-sm">
              {(data?.leaderboard ?? []).map((rep) => (
                <div key={rep.userId} className="flex items-center justify-between py-2">
                  <span className="font-medium">{rep.name}</span>
                  <span className="text-muted-foreground">
                    {rep.wonCount} won · {formatINR(rep.wonValue)} · pipeline {formatINR(rep.pipelineValue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.overdue.length ? (
              data.overdue.map((task) => (
                <div key={task.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-rose-600">Due {formatDate(task.dueDate)}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.assignedUser?.name}
                    {task.lead ? (
                      <>
                        {" · "}
                        <Link className="underline" href={`/leads/${task.lead.id}`}>
                          {task.lead.title}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No overdue tasks.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
