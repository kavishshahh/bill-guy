from flask import Blueprint, g, jsonify, request

from ..middleware.auth_middleware import require_auth
from ..services.daily_entry_service import DailyEntryService

daily_entry_bp = Blueprint("daily_entries", __name__, url_prefix="/api/v1/daily-entries")
daily_entry_service = DailyEntryService()


@daily_entry_bp.post("")
@require_auth
def create_daily_entry():
    body = request.get_json(silent=True) or {}
    required = ["company_id", "financial_year_id", "tx_date", "item_id", "quantity", "sale_rate"]
    missing = [key for key in required if body.get(key) in (None, "")]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    payload = {
        "company_id": body["company_id"],
        "financial_year_id": body["financial_year_id"],
        "tx_date": body["tx_date"],
        "voucher_no": body.get("voucher_no"),
        "challan_no": body.get("challan_no"),
        "site_id": body.get("site_id"),
        "buyer_id": body.get("buyer_id"),
        "item_id": body["item_id"],
        "quantity": body["quantity"],
        "unit": body.get("unit", "MT"),
        "purchase_rate": body.get("purchase_rate"),
        "sale_rate": body["sale_rate"],
        "trip_count": body.get("trip_count", 1),
        "notes": body.get("notes"),
        "metadata": body.get("metadata"),
        "create_invoice": body.get("create_invoice"),
        "invoice_status": body.get("invoice_status"),
    }

    created, error = daily_entry_service.create_entry(g.current_user_id, payload)
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"daily_entry": created}), 201


@daily_entry_bp.get("")
@require_auth
def list_daily_entries():
    company_id = request.args.get("company_id")
    financial_year_id = request.args.get("financial_year_id")

    if not company_id or not financial_year_id:
        return jsonify({"error": "company_id and financial_year_id are required"}), 400

    rows, error = daily_entry_service.list_entries(
        user_id=g.current_user_id,
        company_id=company_id,
        financial_year_id=financial_year_id,
    )
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"daily_entries": rows}), 200
