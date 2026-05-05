from ..db import get_db_session
from ..models import Company


class CompanyRepository:
    def get_company_for_owner(self, company_id: str, owner_user_id: str):
        with get_db_session() as session:
            return (
                session.query(Company)
                .filter(Company.id == company_id, Company.owner_user_id == owner_user_id)
                .first()
            )
