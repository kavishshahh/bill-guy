from datetime import date
import uuid

from sqlalchemy import and_

from ..db import get_db_session
from ..models import Buyer, FinancialYear, Item, Site


class MastersRepository:
    def get_financial_year_for_company(self, fy_id: str, company_id: str):
        with get_db_session() as session:
            return (
                session.query(FinancialYear)
                .filter(FinancialYear.id == fy_id, FinancialYear.company_id == company_id)
                .first()
            )

    def list_financial_years(self, company_id: str):
        with get_db_session() as session:
            rows = (
                session.query(FinancialYear)
                .filter(FinancialYear.company_id == company_id)
                .order_by(FinancialYear.start_date.desc())
                .all()
            )
            return rows

    def create_financial_year(
        self,
        company_id: str,
        *,
        label: str,
        start_date: date,
        end_date: date,
        set_active: bool = False,
    ):
        with get_db_session() as session:
            if set_active:
                session.query(FinancialYear).filter(
                    FinancialYear.company_id == company_id
                ).update({"is_active": False})
            fy = FinancialYear(
                id=uuid.uuid4(),
                company_id=company_id,
                label=label,
                start_date=start_date,
                end_date=end_date,
                is_active=set_active,
                is_closed=False,
            )
            session.add(fy)
            session.flush()
            session.refresh(fy)
            return fy

    def set_active_financial_year(self, company_id: str, fy_id: str):
        with get_db_session() as session:
            target = (
                session.query(FinancialYear)
                .filter(FinancialYear.id == fy_id, FinancialYear.company_id == company_id)
                .first()
            )
            if not target:
                return None
            session.query(FinancialYear).filter(
                FinancialYear.company_id == company_id
            ).update({"is_active": False})
            target.is_active = True
            session.flush()
            session.refresh(target)
            return target

    def list_items(self, company_id: str):
        with get_db_session() as session:
            rows = (
                session.query(Item)
                .filter(Item.company_id == company_id)
                .order_by(Item.name.asc())
                .all()
            )
            return rows

    def create_item(self, company_id: str, name: str, unit: str = "MT"):
        with get_db_session() as session:
            row = Item(id=uuid.uuid4(), company_id=company_id, name=name, unit=unit)
            session.add(row)
            session.flush()
            session.refresh(row)
            return row

    def get_item(self, item_id: str, company_id: str):
        with get_db_session() as session:
            return (
                session.query(Item)
                .filter(and_(Item.id == item_id, Item.company_id == company_id))
                .first()
            )

    def list_sites(self, company_id: str):
        with get_db_session() as session:
            rows = (
                session.query(Site)
                .filter(Site.company_id == company_id)
                .order_by(Site.name.asc())
                .all()
            )
            return rows

    def create_site(self, company_id: str, name: str, location: str | None = None):
        with get_db_session() as session:
            row = Site(
                id=uuid.uuid4(),
                company_id=company_id,
                name=name,
                location=location,
            )
            session.add(row)
            session.flush()
            session.refresh(row)
            return row

    def list_buyers(self, company_id: str):
        with get_db_session() as session:
            rows = (
                session.query(Buyer)
                .filter(Buyer.company_id == company_id)
                .order_by(Buyer.name.asc())
                .all()
            )
            return rows

    def create_buyer(self, company_id: str, name: str):
        with get_db_session() as session:
            row = Buyer(id=uuid.uuid4(), company_id=company_id, name=name)
            session.add(row)
            session.flush()
            session.refresh(row)
            return row

    def get_site(self, site_id: str, company_id: str):
        with get_db_session() as session:
            return (
                session.query(Site)
                .filter(and_(Site.id == site_id, Site.company_id == company_id))
                .first()
            )

    def get_buyer(self, buyer_id: str, company_id: str):
        with get_db_session() as session:
            return (
                session.query(Buyer)
                .filter(and_(Buyer.id == buyer_id, Buyer.company_id == company_id))
                .first()
            )
