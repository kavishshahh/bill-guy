import Link from "next/link";

export default function DashboardHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick an action below to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/companies/new"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">
            Add Company
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Register a new company you own.
          </p>
        </Link>

        <Link
          href="/dashboard/entries/new"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">
            Add Daily Entry
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Post a new transaction against an existing company.
          </p>
        </Link>
      </div>
    </div>
  );
}
