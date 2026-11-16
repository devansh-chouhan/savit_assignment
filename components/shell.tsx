"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CheckSquare,
  Contact,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeft,
  Search,
  Users,
  X,
} from "lucide-react";
import type { Contact as ContactType, Lead, SessionUser } from "@/types/crm";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UserContext = createContext<SessionUser | null>(null);

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("User is not available");
  return user;
}

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

function titleFor(path: string) {
  if (path.startsWith("/leads/")) return "Lead";
  if (path.startsWith("/contacts/import")) return "Import contacts";
  return links.find((link) => path === link.href || path.startsWith(`${link.href}/`))?.label ?? "CRM";
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ leads: Lead[]; contacts: ContactType[] }>({ leads: [], contacts: [] });

  useEffect(() => {
    if (q.trim().length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const data = await api<{ leads: Lead[]; contacts: ContactType[] }>(`/api/search?q=${encodeURIComponent(q.trim())}`);
        setResults(data);
        setOpen(true);
      } catch {
        setOpen(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        onFocus={() => results.leads.length + results.contacts.length > 0 && setOpen(true)}
        placeholder="Search leads and contacts"
        className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && q.trim().length >= 2 ? (
        <div className="absolute z-40 mt-2 w-full rounded-lg border bg-popover p-2 shadow-lg">
          {results.leads.length === 0 && results.contacts.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches</p>
          ) : null}
          {results.leads.map((lead) => (
            <button
              key={lead.id}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setOpen(false);
                router.push(`/leads/${lead.id}`);
              }}
            >
              <span className="font-medium">{lead.title}</span>
              <span className="ml-2 text-muted-foreground">{lead.contact.name}</span>
            </button>
          ))}
          {results.contacts.map((contact) => (
            <button
              key={contact.id}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setOpen(false);
                router.push(`/contacts?q=${encodeURIComponent(contact.name)}`);
              }}
            >
              <span className="font-medium">{contact.name}</span>
              <span className="ml-2 text-muted-foreground">{contact.company?.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 px-4 py-4", collapsed && "justify-center px-2")}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          S
        </div>
        {!collapsed ? (
          <div>
            <p className="text-sm font-semibold leading-none">Savit CRM</p>
            <p className="mt-1 text-xs text-muted-foreground">Sales workspace</p>
          </div>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-accent",
                active && "bg-accent text-accent-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? link.label : null}
            </Link>
          );
        })}
      </nav>
      <div className="hidden p-2 lg:block">
        <Button variant="ghost" className="w-full" onClick={() => setCollapsed((value) => !value)}>
          <PanelLeft className="h-4 w-4" />
          {!collapsed ? "Collapse" : null}
        </Button>
      </div>
    </div>
  );

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-background">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden border-r bg-card lg:block",
            collapsed ? "w-[72px]" : "w-60",
          )}
        >
          {nav}
        </aside>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
            <aside className="relative h-full w-64 border-r bg-card">
              <button className="absolute right-3 top-4" onClick={() => setMobileOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
              {nav}
            </aside>
          </div>
        ) : null}
        <div className={cn("lg:pl-60", collapsed && "lg:pl-[72px]")}>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-semibold">{titleFor(pathname)}</h1>
            <div className="ml-auto flex items-center gap-3">
              <SearchBox />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                    </span>
                    <span className="hidden sm:block">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.email}
                    <br />
                    {user.role === "ADMIN" ? "Admin" : "Sales rep"}
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
