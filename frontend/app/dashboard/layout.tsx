"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { WorkspaceProvider, useWorkspace } from "@/context/workspace-context";
import {
  clearSession,
  ensureAccessTokenFresh,
  getCurrentUser,
  hasAuthCredentials,
  isPastAppSessionDeadline,
  type AuthUser,
} from "@/lib/auth";
import { parseIsoLocal } from "@/lib/transaction-date";

const NAV_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/companies/new", label: "Companies" },
  { href: "/dashboard/entries/new", label: "Daily · Add New" },
];

function fyBarLabel(startIso: string, endIso: string) {
  const a = parseIsoLocal(startIso);
  const b = parseIsoLocal(endIso);
  const seg = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getFullYear()).slice(-2)}`;
  return `${seg(a)} to ${seg(b)}`;
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const ws = useWorkspace();

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string } | undefined;
    const fromMeta = meta?.full_name?.trim();
    if (fromMeta) return fromMeta;
    return user?.email?.split("@")[0] ?? "User";
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      if (typeof window === "undefined") return;
      if (!hasAuthCredentials() || isPastAppSessionDeadline()) {
        clearSession();
        router.replace("/login");
        return;
      }

      const ok = await ensureAccessTokenFresh();
      if (cancelled) return;

      if (!ok) {
        clearSession();
        router.replace("/login");
        return;
      }

      setUser(getCurrentUser());
      setReady(true);
    }

    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    function closeOnOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-900 bg-gradient-to-b from-slate-950 to-slate-900 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-slate-100">
              BMS
            </Link>
            <nav className="hidden gap-1 md:flex">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      active
                        ? "rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-300"
                        : "rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="relative flex items-center gap-3" ref={menuRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
            >
              <span className="hidden sm:inline">
                Welcome {displayName}! Co. -&nbsp;:{" "}
              </span>
              <span className="font-mono text-brand-300">
                {ws.selection
                  ? ws.companyCode(ws.selection.company.id)
                  : ws.loading
                    ? "…"
                    : "—"}
              </span>
              <span className="text-slate-400">▾</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-md border border-slate-600 bg-slate-700 py-1 text-sm shadow-lg">
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-slate-100 hover:bg-slate-600"
                  onClick={() => {
                    setMenuOpen(false);
                    setChangeOpen(true);
                  }}
                >
                  Change Company / FY
                </button>
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-slate-100 hover:bg-slate-600"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="hidden text-xs text-slate-300 underline-offset-4 hover:text-white hover:underline sm:inline"
            >
              Logout
            </button>
          </div>
        </div>

        <nav className="mx-auto flex gap-2 border-t border-slate-800 px-4 py-2 md:hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "rounded-md bg-white/10 px-2 py-1 text-[11px] text-brand-300"
                    : "rounded-md px-2 py-1 text-[11px] text-slate-300"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {ws.selection && (
          <div className="border-t border-slate-800/80 bg-slate-900/90 px-4 py-2 text-[11px] text-slate-400 md:px-6">
            <span className="font-semibold uppercase text-slate-200">
              {ws.selection.company.legal_name || ws.selection.company.name}
            </span>
            <span className="ml-3 text-slate-500">
              [F.&nbsp;Y.: {fyBarLabel(ws.selection.financialYear.start_date, ws.selection.financialYear.end_date)}]
            </span>
            <Link
              href="/dashboard/entries/new"
              className="ml-4 rounded border border-slate-600 px-2 py-0.5 text-[10px] text-brand-300 hover:bg-slate-800"
            >
              [Add New]
            </Link>
          </div>
        )}

        {ws.error && (
          <div className="border-t border-red-900/50 bg-red-950/40 px-4 py-2 text-xs text-red-200 md:px-6">
            {ws.error}
          </div>
        )}
      </header>

      {changeOpen && (
        <ChangeCompanyModal displayName={displayName} onClose={() => setChangeOpen(false)} />
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}

function ChangeCompanyModal({
  displayName,
  onClose,
}: {
  displayName: string;
  onClose: () => void;
}) {
  const ws = useWorkspace();
  const [companyId, setCompanyId] = useState(ws.selectedCompanyId ?? "");
  const [fyId, setFyId] = useState(ws.selectedFyId ?? "");

  const company = ws.companies.find((c) => c.id === companyId);
  const fyOptions = company?.financial_years ?? [];

  useEffect(() => {
    void ws.refresh();
  }, [ws.refresh]);

  useEffect(() => {
    setCompanyId(ws.selectedCompanyId ?? "");
    setFyId(ws.selectedFyId ?? "");
  }, [ws.selectedCompanyId, ws.selectedFyId]);

  useEffect(() => {
    const c = ws.companies.find((x) => x.id === companyId);
    if (!c?.financial_years.length) {
      setFyId("");
      return;
    }
    setFyId((curr) => {
      if (c.financial_years.some((f) => f.id === curr)) return curr;
      const pref =
        c.financial_years.find((f) => f.is_active) ?? c.financial_years[0];
      return pref?.id ?? "";
    });
  }, [companyId, ws.companies]);

  function save() {
    if (!companyId || !fyId) return;
    ws.setSelection(companyId, fyId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Welcome {displayName}</h2>
        <p className="mt-1 text-sm text-slate-600">Choose company and financial year.</p>

        <div className="mt-4 space-y-3">
          {ws.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p>{ws.error}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-red-700 underline hover:no-underline"
                onClick={() => void ws.refresh()}
              >
                Retry loading companies
              </button>
            </div>
          )}

          {ws.loading && (
            <p className="text-sm text-slate-600">Loading companies and financial years…</p>
          )}

          <div>
            <label className="text-xs font-medium uppercase text-slate-500">Company</label>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              value={companyId}
              disabled={ws.loading}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">— Select —</option>
              {ws.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase text-slate-500">Financial year</label>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              value={fyId}
              onChange={(e) => setFyId(e.target.value)}
              disabled={ws.loading || !companyId || !fyOptions.length}
            >
              {!companyId ? (
                <option value="">Select a company first</option>
              ) : !fyOptions.length ? (
                <option value="">No financial years for this company</option>
              ) : (
                fyOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} · {fyBarLabel(f.start_date, f.end_date)}
                  </option>
                ))
              )}
            </select>
          </div>
          {!ws.loading && !ws.error && ws.companies.length === 0 && (
            <p className="text-sm text-amber-700">
              No companies yet.{" "}
              <Link href="/dashboard/companies/new" className="underline" onClick={onClose}>
                Create one first
              </Link>{" "}
              (add a financial year on that screen so it appears here).
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!companyId || !fyId}
            onClick={save}
            className="rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </WorkspaceProvider>
  );
}
