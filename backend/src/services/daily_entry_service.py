from ..repositories.company_repository import CompanyRepository
from ..repositories.daily_entry_repository import DailyEntryRepository


class DailyEntryService:
    def __init__(self):
        self.company_repo = CompanyRepository()
        self.entry_repo = DailyEntryRepository()

    def create_entry(self, user_id: str, payload: dict):
        company = self.company_repo.get_company_for_owner(
            company_id=payload["company_id"], owner_user_id=user_id
        )
        if not company:
            return None, "Company not found or not owned by current user"

        if float(payload["quantity"]) <= 0:
            return None, "Quantity must be greater than zero"

        if float(payload["sale_rate"]) <= 0:
            return None, "Sale rate must be greater than zero"

        created = self.entry_repo.create_entry(payload)
        return created, None

    def list_entries(self, user_id: str, company_id: str, financial_year_id: str):
        company = self.company_repo.get_company_for_owner(
            company_id=company_id, owner_user_id=user_id
        )
        if not company:
            return None, "Company not found or not owned by current user"

        return self.entry_repo.list_entries(company_id, financial_year_id), None
