"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";

type CreateCompanyResponse = {
  company?: {
    id: string;
    name: string;
    legal_name?: string | null;
  };
};

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await apiFetch<CreateCompanyResponse>("/companies", {
        method: "POST",
        body: {
          name,
          legal_name: legalName || null,
        },
      });
      setSuccess(
        res.company?.id
          ? `Company created. ID: ${res.company.id}`
          : "Company created."
      );
      setName("");
      setLegalName("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(
          "The backend doesn't expose POST /api/v1/companies yet. Add a companies handler/service/repo on the Flask side."
        );
      } else if (err instanceof ApiError) {
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
    </div>
  );
}
