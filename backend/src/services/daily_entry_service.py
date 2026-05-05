from datetime import date, datetime

from ..repositories.company_repository import CompanyRepository
from ..repositories.daily_entry_repository import DailyEntryRepository
from ..repositories.masters_repository import MastersRepository


def _coerce_tx_date(raw):
    if isinstance(raw, date):
        return raw
    if raw is None:
        return None
    s = str(raw).strip()
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return date.fromisoformat(s[:10])
    for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except ValueError:
            continue
    return date.fromisoformat(s[:10])


class DailyEntryService:
    def __init__(self):
        self.company_repo = CompanyRepository()
        self.entry_repo = DailyEntryRepository()
        self.masters = MastersRepository()

    def create_entry(self, user_id: str, payload: dict):
        company = self.company_repo.get_company_for_owner(
            company_id=payload["company_id"], owner_user_id=user_id
        )
        if not company:
            return None, "Company not found or not owned by current user"

        fy = self.masters.get_financial_year_for_company(
            payload["financial_year_id"],
            payload["company_id"],
        )
        if not fy:
            return None, "Financial year not found for this company"

        item = self.masters.get_item(payload["item_id"], payload["company_id"])
        if not item:
            return None, "Item not found for this company"

        site_id = payload.get("site_id")
        if site_id:
            if not self.masters.get_site(site_id, payload["company_id"]):
                return None, "Site not found for this company"

        buyer_id = payload.get("buyer_id")
        if buyer_id:
            if not self.masters.get_buyer(buyer_id, payload["company_id"]):
                return None, "Buyer not found for this company"

        td = _coerce_tx_date(payload.get("tx_date"))
        if not td:
            return None, "Invalid transaction date"
        if fy.start_date > td or td > fy.end_date:
            return None, "Transaction date must fall within the selected financial year"

        if float(payload["quantity"]) <= 0:
            return None, "Quantity must be greater than zero"

        if float(payload["sale_rate"]) <= 0:
            return None, "Sale rate must be greater than zero"

        store = dict(payload)
        store["tx_date"] = td

        create_inv = store.get("create_invoice")
        if isinstance(create_inv, str):
            create_inv = create_inv.strip().lower()
        if create_inv in (True, "yes", "y", "1"):
            store["invoice_status"] = "invoiced"
        elif "invoice_status" not in store or store.get("invoice_status") is None:
            store["invoice_status"] = "not_invoiced"

        store.pop("create_invoice", None)

        created = self.entry_repo.create_entry(store)
        return created, None

    def list_entries(self, user_id: str, company_id: str, financial_year_id: str):
        company = self.company_repo.get_company_for_owner(
            company_id=company_id, owner_user_id=user_id
        )
        if not company:
            return None, "Company not found or not owned by current user"

        fy = self.masters.get_financial_year_for_company(
            financial_year_id,
            company_id,
        )
        if not fy:
            return None, "Financial year not found for this company"

        return self.entry_repo.list_entries(company_id, financial_year_id), None
