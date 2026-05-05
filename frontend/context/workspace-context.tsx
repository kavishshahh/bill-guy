"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError, apiFetch } from "@/lib/api";

const LS_COMPANY = "workspace.company_id";
const LS_FY = "workspace.financial_year_id";

export type FinancialYearRow = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
};

export type CompanyRow = {
  id: string;
  name: string;
  legal_name?: string | null;
  financial_years: FinancialYearRow[];
};

type WorkspaceContextValue = {
  companies: CompanyRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<CompanyRow[]>;
  selectedCompanyId: string | null;
  selectedFyId: string | null;
  /** Full company + FY when both selected and still valid */
  selection: { company: CompanyRow; financialYear: FinancialYearRow } | null;
  setSelection: (companyId: string, fyId: string) => void;
  companyCode: (id: string) => string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

type CompaniesResponse = { companies: CompanyRow[] };

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedFyId, setSelectedFyId] = useState<string | null>(null);

  const companyCode = useCallback((id: string) => {
    return id.replace(/-/g, "").slice(0, 8).toUpperCase();
  }, []);

  const refresh = useCallback(async (): Promise<CompanyRow[]> => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<CompaniesResponse>("/companies");
      const list = res.companies ?? [];
      setCompanies(list);

      const companyFromLs =
        typeof window !== "undefined" ? window.localStorage.getItem(LS_COMPANY) : null;

      setSelectedCompanyId((prevCompany) => {
        let next =
          prevCompany && list.some((c) => c.id === prevCompany) ? prevCompany : null;
        if (!next && companyFromLs && list.some((c) => c.id === companyFromLs)) {
          next = companyFromLs;
        }
        if (!next && list[0]) next = list[0].id;
        return next;
      });
      return list;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Unable to load companies.";
      setError(msg);
      setCompanies([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  useEffect(() => {
    if (!selectedCompanyId || companies.length === 0) return;
    const company = companies.find((c) => c.id === selectedCompanyId);
    if (!company) return;

    const fyFromLs =
      typeof window !== "undefined" ? window.localStorage.getItem(LS_FY) : null;
    const companyFromLs =
      typeof window !== "undefined" ? window.localStorage.getItem(LS_COMPANY) : null;

    const active =
      company.financial_years.find((f) => f.is_active) ?? company.financial_years[0];

    setSelectedFyId((prev) => {
      if (prev && company.financial_years.some((f) => f.id === prev)) {
        return prev;
      }
      if (
        companyFromLs === selectedCompanyId &&
        fyFromLs &&
        company.financial_years.some((f) => f.id === fyFromLs)
      ) {
        return fyFromLs;
      }
      return active?.id ?? null;
    });
  }, [selectedCompanyId, companies]);

  const setSelection = useCallback((companyId: string, fyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedFyId(fyId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_COMPANY, companyId);
      window.localStorage.setItem(LS_FY, fyId);
    }
  }, []);

  useEffect(() => {
    if (!selectedCompanyId || !selectedFyId || typeof window === "undefined") return;
    window.localStorage.setItem(LS_COMPANY, selectedCompanyId);
    window.localStorage.setItem(LS_FY, selectedFyId);
  }, [selectedCompanyId, selectedFyId]);

  const selection = useMemo(() => {
    if (!selectedCompanyId || !selectedFyId) return null;
    const company = companies.find((c) => c.id === selectedCompanyId);
    if (!company) return null;
    const financialYear = company.financial_years.find((f) => f.id === selectedFyId);
    if (!financialYear) return null;
    return { company, financialYear };
  }, [companies, selectedCompanyId, selectedFyId]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      companies,
      loading,
      error,
      refresh,
      selectedCompanyId,
      selectedFyId,
      selection,
      setSelection,
      companyCode,
    }),
    [
      companies,
      loading,
      error,
      refresh,
      selectedCompanyId,
      selectedFyId,
      selection,
      setSelection,
      companyCode,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}
