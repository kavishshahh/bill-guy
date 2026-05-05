from datetime import date
import uuid

from ..db import get_db_session
from ..models import Transaction
from ..utils.voucher import resolve_voucher_no


def _serialize_entry(tx: Transaction) -> dict:
    return {
        "id": str(tx.id),
        "company_id": str(tx.company_id),
        "financial_year_id": str(tx.financial_year_id),
        "tx_date": tx.tx_date.isoformat() if tx.tx_date else None,
        "voucher_no": tx.voucher_no,
        "challan_no": tx.challan_no,
        "site_id": str(tx.site_id) if tx.site_id else None,
        "buyer_id": str(tx.buyer_id) if tx.buyer_id else None,
        "item_id": str(tx.item_id),
        "quantity": float(tx.quantity),
        "unit": tx.unit,
        "purchase_rate": float(tx.purchase_rate) if tx.purchase_rate is not None else None,
        "sale_rate": float(tx.sale_rate),
        "trip_count": tx.trip_count,
        "notes": tx.notes,
        "metadata": tx.metadata_,
        "invoice_status": tx.invoice_status,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
        "updated_at": tx.updated_at.isoformat() if tx.updated_at else None,
    }


def _normalize_date(raw) -> date:
    if isinstance(raw, date):
        return raw
    s = str(raw).strip()
    return date.fromisoformat(s[:10])


class DailyEntryRepository:
    def create_entry(self, payload: dict):
        tx_date = payload["tx_date"]
        tx_date = _normalize_date(tx_date)

        qty = payload["quantity"]
        sale_rate = payload["sale_rate"]
        trip = payload.get("trip_count", 1)

        invoice_status = payload.get("invoice_status") or "not_invoiced"

        challan_no = payload.get("challan_no")
        notes = payload.get("notes")
        raw_meta = payload.get("metadata")
        meta_db = raw_meta if isinstance(raw_meta, dict) else None

        purchase_rate = payload.get("purchase_rate")
        if purchase_rate in ("", None):
            purchase_rate = None
        else:
            purchase_rate = float(purchase_rate)

        site_raw = payload.get("site_id")
        site_id = None if site_raw in (None, "") else site_raw

        buyer_raw = payload.get("buyer_id")
        buyer_id = None if buyer_raw in (None, "") else buyer_raw

        with get_db_session() as session:
            tx_id = uuid.uuid4()
            voucher_no = resolve_voucher_no(tx_id, payload.get("voucher_no"))
            tx = Transaction(
                id=tx_id,
                company_id=payload["company_id"],
                financial_year_id=payload["financial_year_id"],
                tx_date=tx_date,
                voucher_no=voucher_no,
                challan_no=challan_no or None,
                site_id=site_id,
                buyer_id=buyer_id,
                item_id=payload["item_id"],
                quantity=qty,
                unit=(payload.get("unit") or "MT"),
                purchase_rate=purchase_rate,
                sale_rate=float(sale_rate),
                trip_count=int(trip),
                notes=notes or None,
                metadata_=meta_db,
                invoice_status=invoice_status,
            )
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
