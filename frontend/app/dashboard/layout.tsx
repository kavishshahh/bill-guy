"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearSession, getCurrentUser, isAuthenticated, type AuthUser } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/companies/new", label: "Add Company" },
  { href: "/dashboard/entries/new", label: "Add Entry" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setUser(getCurrentUser());
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Daily Entries
          </Link>
          <nav className="hidden gap-4 md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                      : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user?.email ?? ""}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 px-6 pb-3 md:hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
