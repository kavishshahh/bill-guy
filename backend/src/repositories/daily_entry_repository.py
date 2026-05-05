from ..db import get_db_session
from ..models import Transaction


def _serialize_entry(tx: Transaction) -> dict:
    return {
        "id": str(tx.id),
        "company_id": str(tx.company_id),
        "financial_year_id": str(tx.financial_year_id),
        "tx_date": tx.tx_date.isoformat() if tx.tx_date else None,
        "voucher_no": tx.voucher_no,
        "challan_no": tx.challan_no,
        "site_id": str(tx.site_id) if tx.site_id else None,
        "item_id": str(tx.item_id),
        "quantity": float(tx.quantity),
        "unit": tx.unit,
        "purchase_rate": float(tx.purchase_rate) if tx.purchase_rate is not None else None,
        "sale_rate": float(tx.sale_rate),
        "trip_count": tx.trip_count,
        "notes": tx.notes,
        "invoice_status": tx.invoice_status,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    }


class DailyEntryRepository:
    def create_entry(self, payload: dict):
        with get_db_session() as session:
            tx = Transaction(**payload)
            session.add(tx)
            session.flush()
            session.refresh(tx)
            return _serialize_entry(tx)

    def list_entries(self, company_id: str, financial_year_id: str):
        with get_db_session() as session:
            rows = (
                session.query(Transaction)
                .filter(
                    Transaction.company_id == company_id,
                    Transaction.financial_year_id == financial_year_id,
                )
                .order_by(Transaction.tx_date.desc(), Transaction.created_at.desc())
                .all()
            )
            return [_serialize_entry(row) for row in rows]
