"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";

type CreateEntryResponse = {
  daily_entry?: {
    id: string;
    company_id: string;
    tx_date: string;
    quantity: number;
    sale_rate: number;
  };
};

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

export default function NewDailyEntryPage() {
  const router = useRouter();

  // Required fields per backend handler:
  //   company_id, financial_year_id, tx_date, item_id, quantity, sale_rate
  const [companyId, setCompanyId] = useState("");
  const [financialYearId, setFinancialYearId] = useState("");
  const [txDate, setTxDate] = useState<string>(TODAY_ISO());
  const [itemId, setItemId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("MT");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [saleRate, setSaleRate] = useState("");
  const [voucherNo, setVoucherNo] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [tripCount, setTripCount] = useState("1");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload = {
        company_id: companyId,
        financial_year_id: financialYearId,
        tx_date: txDate,
        item_id: itemId,
        site_id: siteId || null,
        quantity: Number(quantity),
        unit: unit || "MT",
        purchase_rate: purchaseRate ? Number(purchaseRate) : null,
        sale_rate: Number(saleRate),
        trip_count: tripCount ? Number(tripCount) : 1,
        voucher_no: voucherNo || null,
        challan_no: challanNo || null,
        notes: notes || null,
      };

      const res = await apiFetch<CreateEntryResponse>("/daily-entries", {
        method: "POST",
        body: payload,
      });

      setSuccess(
        res.daily_entry?.id
          ? `Entry created. ID: ${res.daily_entry.id}`
          : "Entry created."
      );
      setVoucherNo("");
      setChallanNo("");
      setNotes("");
      setQuantity("");
      setSaleRate("");
      setPurchaseRate("");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to reach the server.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add daily entry</h1>
        <p className="mt-1 text-sm text-slate-500">
          Post a new transaction against one of your companies.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Section title="Required" subtitle="All UUIDs reference existing rows.">
          <Field
            label="Company ID"
            required
            value={companyId}
            onChange={setCompanyId}
            placeholder="UUID"
          />
          <Field
            label="Financial year ID"
            required
            value={financialYearId}
            onChange={setFinancialYearId}
            placeholder="UUID"
          />
          <Field
            label="Item ID"
            required
            value={itemId}
            onChange={setItemId}
            placeholder="UUID"
          />
          <Field
            label="Transaction date"
            required
            type="date"
            value={txDate}
            onChange={setTxDate}
          />
          <Field
            label="Quantity"
            required
            type="number"
            step="0.001"
            min="0"
            value={quantity}
            onChange={setQuantity}
          />
          <Field
            label="Sale rate"
            required
            type="number"
            step="0.01"
            min="0"
            value={saleRate}
            onChange={setSaleRate}
          />
        </Section>

        <Section title="Optional">
          <Field label="Site ID" value={siteId} onChange={setSiteId} placeholder="UUID" />
          <Field label="Unit" value={unit} onChange={setUnit} placeholder="MT" />
          <Field
            label="Purchase rate"
            type="number"
            step="0.01"
            min="0"
            value={purchaseRate}
            onChange={setPurchaseRate}
          />
          <Field
            label="Trip count"
            type="number"
            step="1"
            min="1"
            value={tripCount}
            onChange={setTripCount}
          />
          <Field label="Voucher No." value={voucherNo} onChange={setVoucherNo} />
          <Field label="Challan No." value={challanNo} onChange={setChallanNo} />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </Section>

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
            {loading ? "Saving..." : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  step?: string;
  min?: string;
  placeholder?: string;
};

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  step,
  min,
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        step={step}
        min={min}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}
