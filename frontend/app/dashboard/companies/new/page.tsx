"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/context/workspace-context";
import { ApiError, apiFetch } from "@/lib/api";
import { toApiDate } from "@/lib/transaction-date";

type CreateCompanyResponse = {
  company?: {
    id: string;
    name: string;
    legal_name?: string | null;
    financial_years?: { id: string }[];
  };
};

export default function NewCompanyPage() {
  const router = useRouter();
  const ws = useWorkspace();

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [fyLabel, setFyLabel] = useState("FY April–March");
  const [fyStart, setFyStart] = useState("");
  const [fyEnd, setFyEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [addFyCompanyId, setAddFyCompanyId] = useState("");
  const [addFyLabel, setAddFyLabel] = useState("FY April–March");
  const [addFyStart, setAddFyStart] = useState("");
  const [addFyEnd, setAddFyEnd] = useState("");
  const [addFyLoading, setAddFyLoading] = useState(false);
  const [addFyError, setAddFyError] = useState<string | null>(null);
  const [addFySuccess, setAddFySuccess] = useState<string | null>(null);

  useEffect(() => {
    void ws.refresh();
  }, [ws.refresh]);

  const companiesMissingFy = useMemo(
    () => ws.companies.filter((c) => !(c.financial_years && c.financial_years.length > 0)),
    [ws.companies]
  );

  useEffect(() => {
    if (!addFyCompanyId && companiesMissingFy[0]) {
      setAddFyCompanyId(companiesMissingFy[0].id);
    }
    if (addFyCompanyId && !companiesMissingFy.some((c) => c.id === addFyCompanyId)) {
      setAddFyCompanyId(companiesMissingFy[0]?.id ?? "");
    }
  }, [companiesMissingFy, addFyCompanyId]);

  async function handleAddFyToExisting(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddFyError(null);
    setAddFySuccess(null);
    const startIso = toApiDate(addFyStart);
    const endIso = toApiDate(addFyEnd);
    if (!addFyCompanyId || !addFyStart.trim() || !addFyEnd.trim()) {
      setAddFyError("Choose a company and enter both FY dates.");
      return;
    }
    if (!startIso || !endIso) {
      setAddFyError("Use DD-MM-YYYY or YYYY-MM-DD (e.g. 01-04-2026 or 2026-04-01).");
      return;
    }
    setAddFyLoading(true);
    try {
      await apiFetch(`/companies/${addFyCompanyId}/financial-years`, {
        method: "POST",
        body: {
          label: addFyLabel.trim() || "FY",
          start_date: startIso,
          end_date: endIso,
          make_active: true,
        },
      });
      await ws.refresh();
      setAddFySuccess("Financial year saved.");
      setAddFyStart("");
      setAddFyEnd("");
    } catch (err) {
      setAddFyError(err instanceof ApiError ? err.message : "Request failed.");
    } finally {
      setAddFyLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        legal_name: legalName || null,
      };

      const fyStartT = fyStart.trim();
      const fyEndT = fyEnd.trim();
      const startIso = fyStartT ? toApiDate(fyStartT) : null;
      const endIso = fyEndT ? toApiDate(fyEndT) : null;

      if (fyStartT && fyEndT) {
        if (!startIso || !endIso) {
          setError("FY dates must be valid DD-MM-YYYY or YYYY-MM-DD (e.g. 01-04-2026).");
          setLoading(false);
          return;
        }
        body.financial_year = {
          label: fyLabel.trim() || "FY",
          start_date: startIso,
          end_date: endIso,
          make_active: true,
        };
      } else if (fyStartT !== fyEndT && (fyStartT || fyEndT)) {
        setError("Enter both financial year start and end dates, or leave both empty.");
        setLoading(false);
        return;
      }

      const res = await apiFetch<CreateCompanyResponse>("/companies", {
        method: "POST",
        body,
      });
      const newId = res.company?.id;
      if (!newId) {
        setSuccess("Company created.");
      } else {
        const list = await ws.refresh();
        const fyPick =
          res.company?.financial_years?.[0]?.id ??
          list.find((x) => x.id === newId)?.financial_years?.[0]?.id ??
          null;
        if (fyPick) {
          ws.setSelection(newId, fyPick);
        }
        setSuccess(
          fyStart.trim() && fyEnd.trim()
            ? `Company and financial year are ready. Open “Daily · Add New” to post transactions.`
            : `Company created. Add a financial year using the dates below next time so entries can be posted.`
        );
      }
      setName("");
      setLegalName("");
      setFyStart("");
      setFyEnd("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to reach the server.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add company</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a company you own. Daily entries are tied to companies.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Display name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Traders"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="legal_name" className="block text-sm font-medium text-slate-700">
            Legal name
          </label>
          <input
            id="legal_name"
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="e.g. Acme Traders Pvt. Ltd."
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Financial year{" "}
            <span className="font-normal text-slate-500">(recommended)</span>
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label htmlFor="fy_label" className="block text-xs font-medium text-slate-600">
                Label
              </label>
              <input
                id="fy_label"
                type="text"
                value={fyLabel}
                onChange={(e) => setFyLabel(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="fy_start" className="block text-xs font-medium text-slate-600">
                Start date
              </label>
              <input
                id="fy_start"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="DD-MM-YYYY"
                value={fyStart}
                onChange={(e) => setFyStart(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="fy_end" className="block text-xs font-medium text-slate-600">
                End date
              </label>
              <input
                id="fy_end"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="DD-MM-YYYY"
                value={fyEnd}
                onChange={(e) => setFyEnd(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Type dates as <code className="rounded bg-white px-1">01-04-2026</code> or{" "}
            <code className="rounded bg-white px-1">2026-04-01</code>. Example FY:{" "}
            <code className="rounded bg-white px-1">01-04-2026</code> →{" "}
            <code className="rounded bg-white px-1">31-03-2027</code>.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
            {success}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create company"}
          </button>
        </div>
      </form>

      {companiesMissingFy.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Add financial year to an existing company
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            If a company was saved without FY dates, choose it here and add start/end dates. They
            will show in the workspace picker after saving.
          </p>
          <form onSubmit={handleAddFyToExisting} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Company</label>
              <select
                className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={addFyCompanyId}
                onChange={(e) => setAddFyCompanyId(e.target.value)}
              >
                {companiesMissingFy.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Label</label>
              <input
                type="text"
                value={addFyLabel}
                onChange={(e) => setAddFyLabel(e.target.value)}
                className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Start date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="DD-MM-YYYY"
                  value={addFyStart}
                  onChange={(e) => setAddFyStart(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">End date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="DD-MM-YYYY"
                  value={addFyEnd}
                  onChange={(e) => setAddFyEnd(e.target.value)}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {addFyError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{addFyError}</div>
            )}
            {addFySuccess && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {addFySuccess}
              </div>
            )}
            <button
              type="submit"
              disabled={addFyLoading}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {addFyLoading ? "Saving…" : "Save financial year"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
