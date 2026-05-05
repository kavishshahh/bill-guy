"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/context/workspace-context";
import { ApiError, apiFetch } from "@/lib/api";
import { expandDdmmInFy, padDateParts, parseIsoLocal, toApiDate } from "@/lib/transaction-date";

type MastersResponse = {
  items: { id: string; name: string; unit: string }[];
  sites: { id: string; name: string; location?: string | null }[];
  buyers: { id: string; name: string }[];
};

type CreateEntryResponse = {
  daily_entry?: {
    id: string;
    voucher_no?: string | null;
  };
};

const emptyDim = { ft: "", in: "", cm: "", inches_eq: "" };

export default function NewDailyEntryPage() {
  const router = useRouter();
  const ws = useWorkspace();

  const [masters, setMasters] = useState<MastersResponse | null>(null);
  const [mastersErr, setMastersErr] = useState<string | null>(null);

  const fy = ws.selection?.financialYear;
  const companyId = ws.selection?.company.id ?? "";

  const [txDateDisplay, setTxDateDisplay] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [itemId, setItemId] = useState("");

  const [voucherNo, setVoucherNo] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [lorryCode, setLorryCode] = useState("");
  const [tripCount, setTripCount] = useState("1");
  const [getPrevious, setGetPrevious] = useState(false);
  const [purchaseRate, setPurchaseRate] = useState("");
  const [saleRate, setSaleRate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [createInvoice, setCreateInvoice] = useState<"yes" | "no">("no");
  const [length, setLength] = useState({ ...emptyDim });
  const [breadth, setBreadth] = useState({ ...emptyDim });
  const [height, setHeight] = useState({ ...emptyDim });
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedItem = useMemo(
    () => masters?.items.find((i) => i.id === itemId),
    [masters, itemId]
  );
  const unitReadout = selectedItem?.unit ?? "";

  const loadMasters = useCallback(async () => {
    if (!companyId) {
      setMasters(null);
      return;
    }
    setMastersErr(null);
    try {
      const data = await apiFetch<MastersResponse>(`/companies/${companyId}/masters`);
      setMasters(data);
    } catch (e) {
      setMasters(null);
      setMastersErr(e instanceof ApiError ? e.message : "Failed to load lists.");
    }
  }, [companyId]);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  function initTxDate() {
    if (!fy) return "";
    const t = parseIsoLocal(fy.start_date);
    return padDateParts(t.getDate(), t.getMonth() + 1, t.getFullYear());
  }

  useEffect(() => {
    if (!txDateDisplay && fy) {
      setTxDateDisplay(initTxDate());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when fy appears
  }, [fy?.id]);

  function onTxDateKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Tab") return;
    const el = e.currentTarget;
    const v = el.value.trim();
    if (!fy || v.length === 0) return;

    const expanded = expandDdmmInFy(v, fy.start_date, fy.end_date);
    if (expanded) {
      e.preventDefault();
      setTxDateDisplay(expanded);
      requestAnimationFrame(() => {
        const form = el.form;
        if (!form) return;
        const idx = Array.prototype.indexOf.call(form.elements, el);
        const next = form.elements[idx + 1] as HTMLElement | undefined;
        next?.focus();
      });
    }
  }

  function onTxDateBlur() {
    if (!fy || !txDateDisplay.trim()) return;
    const expanded = expandDdmmInFy(txDateDisplay, fy.start_date, fy.end_date);
    if (expanded) setTxDateDisplay(expanded);
  }

  async function quickAdd(
    kind: "buyer" | "item" | "site",
    name: string,
    unit?: string
  ) {
    const n = name.trim();
    if (!companyId || !n) return;
    try {
      if (kind === "buyer") {
        const res = await apiFetch<{ buyer: { id: string } }>(
          `/companies/${companyId}/buyers`,
          { method: "POST", body: { name: n } }
        );
        await loadMasters();
        setBuyerId(res.buyer.id);
      } else if (kind === "item") {
        const res = await apiFetch<{ item: { id: string } }>(
          `/companies/${companyId}/items`,
          { method: "POST", body: { name: n, unit: unit || "MT" } }
        );
        await loadMasters();
        setItemId(res.item.id);
      } else {
        const res = await apiFetch<{ site: { id: string } }>(
          `/companies/${companyId}/sites`,
          { method: "POST", body: { name: n } }
        );
        await loadMasters();
        setSiteId(res.site.id);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Create failed");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!ws.selection) {
      setError("Choose a company and financial year from the header menu first.");
      return;
    }
    if (!itemId) {
      setError("Select an item.");
      return;
    }

    const apiDate = toApiDate(txDateDisplay);
    if (!apiDate) {
      setError("Enter a valid transaction date (DD-MM-YYYY or use 4 digits DDMM + Tab).");
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        lorry_code: lorryCode || undefined,
        get_previous_values: getPrevious,
        lorry: {
          length,
          breadth,
          height,
        },
        create_invoice: createInvoice,
      };

      const payload = {
        company_id: ws.selection.company.id,
        financial_year_id: ws.selection.financialYear.id,
        tx_date: apiDate,
        voucher_no: voucherNo || null,
        challan_no: challanNo || null,
        site_id: siteId || null,
        buyer_id: buyerId || null,
        item_id: itemId,
        quantity: Number(quantity),
        unit: unitReadout || "MT",
        purchase_rate: purchaseRate ? Number(purchaseRate) : null,
        sale_rate: Number(saleRate),
        trip_count: tripCount ? Number(tripCount) : 1,
        notes: notes || null,
        metadata,
        create_invoice: createInvoice,
      };

      const res = await apiFetch<CreateEntryResponse>("/daily-entries", {
        method: "POST",
        body: payload,
      });

      const v = res.daily_entry?.voucher_no;
      const id = res.daily_entry?.id;
      setSuccess(
        id ? `Saved. Voucher: ${v ?? "—"} · Reference id: ${id}` : "Saved."
      );
      setVoucherNo("");
      setChallanNo("");
      setLorryCode("");
      setTripCount("1");
      setGetPrevious(false);
      setPurchaseRate("");
      setSaleRate("");
      setQuantity("");
      setNotes("");
      setLength({ ...emptyDim });
      setBreadth({ ...emptyDim });
      setHeight({ ...emptyDim });
      setItemId("");
      setTxDateDisplay(initTxDate());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  if (!ws.selection) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-medium">Select company and financial year</p>
        <p className="mt-2 text-amber-800">
          Use <strong>Change Company / FY</strong> in the top-right menu, or{" "}
          <Link href="/dashboard/companies/new" className="underline">
            add a company
          </Link>{" "}
          and create a financial year for it.
        </p>
      </div>
    );
  }

  const companyTitle = ws.selection.company.legal_name || ws.selection.company.name;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
          Transaction [Add New]
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {companyTitle}
          <span className="ml-2 text-slate-500">
            [F.&nbsp;Y.: {fyBar(ws.selection.financialYear)}]
          </span>
        </p>
      </div>

      {mastersErr && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {mastersErr}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 border border-slate-300 bg-white p-4 shadow-sm md:p-6"
      >
        <GridRow>
          <div>
            <FieldLabel>Transaction date</FieldLabel>
            <input
              name="tx_date"
              value={txDateDisplay}
              onChange={(e) => setTxDateDisplay(e.target.value)}
              onKeyDown={onTxDateKeyDown}
              onBlur={onTxDateBlur}
              placeholder="DD-MM-YYYY or DDMM + Tab"
              className={inputClass}
              autoComplete="off"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Tip: enter <kbd className="rounded bg-slate-100 px-1">0104</kbd> then Tab to
              expand within this financial year.
            </p>
          </div>
          <div>
            <FieldLabel>Last invoice no.</FieldLabel>
            <div className="flex h-[38px] items-center rounded border border-dashed border-slate-200 bg-slate-50 px-3 text-sm text-slate-400">
              —
            </div>
          </div>
        </GridRow>

        <GridRow>
          <div>
            <FieldLabel>Voucher number</FieldLabel>
            <p className="mb-1 text-[10px] font-normal normal-case text-slate-500">
              Leave blank — the server assigns a unique code (e.g. VCH-…). Override only if you
              need your own number.
            </p>
            <input
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              placeholder="Auto-generated if empty"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Lorry code</FieldLabel>
            <div className="flex gap-2">
              <input
                value={lorryCode}
                onChange={(e) => setLorryCode(e.target.value)}
                className={inputClass + " flex-1"}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Number of trips</FieldLabel>
            <input
              type="number"
              min={1}
              value={tripCount}
              onChange={(e) => setTripCount(e.target.value)}
              className={inputClass}
            />
          </div>
        </GridRow>

        <GridRow>
          <div>
            <FieldLabel>Challan number</FieldLabel>
            <input
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Buyer</FieldLabel>
            <QuickLink
              label="Add New Buyer"
              onAdd={() => {
                const n = window.prompt("Buyer name?");
                if (n) void quickAdd("buyer", n);
              }}
            />
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className={selectClass}
            >
              <option value="">------ SELECT ------</option>
              {masters?.buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </GridRow>

        <GridRow>
          <div className="md:col-span-2">
            <FieldLabel>Site</FieldLabel>
            <QuickLink
              label="Add New Site"
              onAdd={() => {
                const n = window.prompt("Site name?");
                if (n) void quickAdd("site", n);
              }}
            />
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className={selectClass}
            >
              <option value="">------ SELECT ------</option>
              {masters?.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.location ? ` — ${s.location}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Item</FieldLabel>
            <QuickLink
              label="Add New Item"
              onAdd={() => {
                const n = window.prompt("Item name?");
                if (!n) return;
                const u = window.prompt("Unit (e.g. Brass, MT)?", "MT");
                void quickAdd("item", n, u || "MT");
              }}
            />
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className={selectClass}
            >
              <option value="">------ SELECT ------</option>
              {masters?.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </GridRow>

        <div>
          <FieldLabel>Unit</FieldLabel>
          <div className="mt-1 min-h-[38px] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
            {itemId ? unitReadout || "—" : "—"}
          </div>
        </div>

        {itemId && (
          <div className="space-y-5 border-t border-slate-200 pt-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={getPrevious}
                onChange={(e) => setGetPrevious(e.target.checked)}
                className="rounded border-slate-400"
              />
              Get Previous Values
            </label>

            <GridRow>
              <div>
                <FieldLabel>Purchase rate</FieldLabel>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Sale rate</FieldLabel>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={saleRate}
                  onChange={(e) => setSaleRate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </GridRow>

            <DimRow label="Length of lorry" value={length} onChange={setLength} />
            <DimRow label="Breadth of lorry" value={breadth} onChange={setBreadth} />
            <DimRow label="Height of lorry" value={height} onChange={setHeight} />

            <GridRow>
              <div>
                <FieldLabel>Quantity</FieldLabel>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Create invoice?</FieldLabel>
                <select
                  value={createInvoice}
                  onChange={(e) => setCreateInvoice(e.target.value as "yes" | "no")}
                  className={selectClass}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </GridRow>
          </div>
        )}

        <div>
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass + " resize-y"}
          />
        </div>

        {error && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
            {success}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || !itemId}
            className="rounded bg-brand-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function fyBar(fy: { start_date: string; end_date: string }) {
  const a = parseIsoLocal(fy.start_date);
  const b = parseIsoLocal(fy.end_date);
  const seg = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getFullYear()).slice(-2)}`;
  return `${seg(a)} to ${seg(b)}`;
}

const inputClass =
  "mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const selectClass = inputClass + " bg-white";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
      {children}
    </span>
  );
}

function GridRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-3">{children}</div>;
}

function QuickLink({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="mb-1 block text-left text-xs font-normal normal-case text-blue-600 hover:underline"
    >
      [{label}]
    </button>
  );
}

type Dim = { ft: string; in: string; cm: string; inches_eq: string };

function DimRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Dim;
  onChange: (v: Dim) => void;
}) {
  const ph = ["Feet", "Inches", "Cms", "(=) Inches"] as const;
  const keys: (keyof Dim)[] = ["ft", "in", "cm", "inches_eq"];
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {keys.map((k, i) => (
          <input
            key={k}
            value={value[k]}
            placeholder={ph[i]}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            className={inputClass + " mt-0"}
          />
        ))}
      </div>
    </div>
  );
}
