from datetime import date
import uuid

from sqlalchemy import func

from ..db import get_db_session
from ..models import Company, FinancialYear


class CompanyRepository:
    def get_company_for_owner(self, company_id: str, owner_user_id: str):
        with get_db_session() as session:
            return (
                session.query(Company)
                .filter(Company.id == company_id, Company.owner_user_id == owner_user_id)
                .first()
            )

    def list_companies_for_owner(self, owner_user_id: str):
        with get_db_session() as session:
            return (
                session.query(Company)
                .filter(Company.owner_user_id == owner_user_id)
                .order_by(Company.name.asc())
                .all()
            )

    def get_company_for_owner_by_name_ci(self, owner_user_id: str, name: str):
        """Matches unique index ux_companies_owner_name (owner_user_id, lower(name))."""
        key = (name or "").strip().lower()
        if not key:
            return None
        with get_db_session() as session:
            return (
                session.query(Company)
                .filter(
                    Company.owner_user_id == owner_user_id,
                    func.lower(Company.name) == key,
                )
                .first()
            )

    def create_company(self, owner_user_id: str, name: str, legal_name: str | None):
        with get_db_session() as session:
            row = Company(
                id=uuid.uuid4(),
                owner_user_id=owner_user_id,
                name=name,
                legal_name=legal_name,
            )
            session.add(row)
            session.flush()
            session.refresh(row)
            return row

    def create_company_with_financial_year(
        self,
        owner_user_id: str,
        name: str,
        legal_name: str | None,
        *,
        fy_label: str,
        fy_start: date,
        fy_end: date,
        fy_make_active: bool,
    ):
        """Insert company and first FY in one transaction (always persisted together)."""
        with get_db_session() as session:
            row = Company(
                id=uuid.uuid4(),
                owner_user_id=owner_user_id,
                name=name,
                legal_name=legal_name,
            )
            session.add(row)
            session.flush()

            if fy_make_active:
                session.query(FinancialYear).filter(
                    FinancialYear.company_id == row.id
                ).update({"is_active": False})

            fy = FinancialYear(
                id=uuid.uuid4(),
                company_id=row.id,
                label=fy_label,
                start_date=fy_start,
                end_date=fy_end,
                is_active=fy_make_active,
                is_closed=False,
            )
            session.add(fy)
            session.flush()
            session.refresh(row)
            session.refresh(fy)
            return row, fy
