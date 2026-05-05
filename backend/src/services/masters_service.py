from ..repositories.company_repository import CompanyRepository
from ..repositories.masters_repository import MastersRepository


class MastersService:
    def __init__(self):
        self.companies = CompanyRepository()
        self.masters = MastersRepository()

    def _require_company(self, user_id: str, company_id: str):
        c = self.companies.get_company_for_owner(company_id, user_id)
        if not c:
            return None, "Company not found or not owned by current user"
        return c, None

    def lookup_all(self, user_id: str, company_id: str):
        err = self._require_company(user_id, company_id)[1]
        if err:
            return None, err
        items = self.masters.list_items(company_id)
        sites = self.masters.list_sites(company_id)
        buyers = self.masters.list_buyers(company_id)
        return (
            {
                "items": [
                    {"id": str(i.id), "name": i.name, "unit": i.unit} for i in items
                ],
                "sites": [
                    {"id": str(s.id), "name": s.name, "location": s.location}
                    for s in sites
                ],
                "buyers": [{"id": str(b.id), "name": b.name} for b in buyers],
            },
            None,
        )

    def create_item(self, user_id: str, company_id: str, *, name: str, unit: str | None):
        _, err = self._require_company(user_id, company_id)
        if err:
            return None, err
        nm = (name or "").strip()
        if not nm:
            return None, "name is required"
        row = self.masters.create_item(company_id, nm, (unit or "MT").strip() or "MT")
        return {"id": str(row.id), "name": row.name, "unit": row.unit}, None

    def create_site(
        self, user_id: str, company_id: str, *, name: str, location: str | None
    ):
        _, err = self._require_company(user_id, company_id)
        if err:
            return None, err
        nm = (name or "").strip()
        if not nm:
            return None, "name is required"
        row = self.masters.create_site(company_id, nm, location=(location or "").strip() or None)
        return {
            "id": str(row.id),
            "name": row.name,
            "location": row.location,
        }, None

    def create_buyer(self, user_id: str, company_id: str, *, name: str):
        _, err = self._require_company(user_id, company_id)
        if err:
            return None, err
        nm = (name or "").strip()
        if not nm:
            return None, "name is required"
        row = self.masters.create_buyer(company_id, nm)
        return {"id": str(row.id), "name": row.name}, None
