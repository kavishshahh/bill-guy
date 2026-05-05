from datetime import date

from ..repositories.company_repository import CompanyRepository
from ..repositories.masters_repository import MastersRepository


def _serialize_fy(row):
    return {
        "id": str(row.id),
        "label": row.label,
        "start_date": row.start_date.isoformat(),
        "end_date": row.end_date.isoformat(),
        "is_active": row.is_active,
        "is_closed": row.is_closed,
    }


def _serialize_company(row, financial_years):
    return {
        "id": str(row.id),
        "name": row.name,
        "legal_name": row.legal_name,
        "financial_years": [_serialize_fy(fy) for fy in financial_years],
    }


class CompanyService:
    def __init__(self):
        self.companies = CompanyRepository()
        self.masters = MastersRepository()

    def list_companies(self, owner_user_id: str):
        companies = self.companies.list_companies_for_owner(owner_user_id)
        payload = []
        for c in companies:
            fys = self.masters.list_financial_years(str(c.id))
            payload.append(_serialize_company(c, fys))
        return payload

    def create_company(
        self,
        owner_user_id: str,
        *,
        name: str,
        legal_name: str | None,
        financial_year: dict | None = None,
    ):
        name_clean = (name or "").strip()
        if not name_clean:
            return None, "name is required"
        if self.companies.get_company_for_owner_by_name_ci(owner_user_id, name_clean):
            return (
                None,
                "A company with this name already exists for your account (names are checked case-insensitively).",
            )
        if financial_year:
            lab = (financial_year.get("label") or "FY").strip()
            if not lab:
                return None, "financial_year.label is required when financial_year is sent"

            sd = financial_year.get("start_date")
            ed = financial_year.get("end_date")
            if not isinstance(sd, date) or not isinstance(ed, date):
                return None, "financial_year.start_date and end_date must be valid dates"

            if ed < sd:
                return None, "end_date must be on or after start_date"

            make_active = bool(financial_year.get("make_active", True))

            row, fy_row = self.companies.create_company_with_financial_year(
                owner_user_id,
                name_clean,
                legal_name,
                fy_label=lab,
                fy_start=sd,
                fy_end=ed,
                fy_make_active=make_active,
            )
            return _serialize_company(row, [fy_row]), None

        row = self.companies.create_company(owner_user_id, name_clean, legal_name)
        fys = self.masters.list_financial_years(str(row.id))
        return _serialize_company(row, fys), None

    def create_financial_year(
        self,
        owner_user_id: str,
        company_id: str,
        *,
        label: str,
        start_date: date,
        end_date: date,
        make_active: bool | None = None,
    ):
        company = self.companies.get_company_for_owner(company_id, owner_user_id)
        if not company:
            return None, "Company not found or not owned by current user"

        lab = (label or "").strip()
        if not lab:
            return None, "label is required"

        if end_date < start_date:
            return None, "end_date must be on or after start_date"

        existing = self.masters.list_financial_years(company_id)
        set_active = bool(make_active) if make_active is not None else len(existing) == 0

        row = self.masters.create_financial_year(
            company_id,
            label=lab,
            start_date=start_date,
            end_date=end_date,
            set_active=set_active,
        )
        return _serialize_fy(row), None

    def activate_financial_year(self, owner_user_id: str, company_id: str, fy_id: str):
        company = self.companies.get_company_for_owner(company_id, owner_user_id)
        if not company:
            return None, "Company not found or not owned by current user"

        row = self.masters.set_active_financial_year(company_id, fy_id)
        if not row:
            return None, "Financial year not found for this company"
        return _serialize_fy(row), None
