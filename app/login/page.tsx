"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@savit.dev");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%)] px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            S
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Savit CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to the sales workspace.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-6 space-y-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <button type="button" className="block text-left hover:text-foreground" onClick={() => { setEmail("admin@savit.dev"); setPassword("Admin@123"); }}>
            Admin — admin@savit.dev / Admin@123
          </button>
          <button type="button" className="block text-left hover:text-foreground" onClick={() => { setEmail("rohan.mehta@savit.dev"); setPassword("Rep@123"); }}>
            Sales rep — rohan.mehta@savit.dev / Rep@123
          </button>
          <button type="button" className="block text-left hover:text-foreground" onClick={() => { setEmail("priya.nair@savit.dev"); setPassword("Rep@123"); }}>
            Sales rep — priya.nair@savit.dev / Rep@123
          </button>
        </div>
      </div>
    </main>
  );
}
