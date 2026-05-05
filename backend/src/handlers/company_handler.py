from datetime import date

from flask import Blueprint, g, jsonify, request

from ..middleware.auth_middleware import require_auth
from ..services.company_service import CompanyService
from ..services.masters_service import MastersService

company_bp = Blueprint("companies", __name__, url_prefix="/api/v1/companies")

company_service = CompanyService()
masters_service = MastersService()


def _parse_iso_date(raw):
    try:
        return date.fromisoformat(str(raw)[:10])
    except (TypeError, ValueError):
        return None


@company_bp.get("")
@require_auth
def list_companies():
    rows = company_service.list_companies(g.current_user_id)
    return jsonify({"companies": rows}), 200


@company_bp.post("")
@require_auth
def create_company():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    legal_name = body.get("legal_name")

    fy_raw = body.get("financial_year")
    financial_year = None
    if fy_raw is not None:
        if not isinstance(fy_raw, dict):
            return jsonify({"error": "financial_year must be an object"}), 400
        sd = _parse_iso_date(fy_raw.get("start_date"))
        ed = _parse_iso_date(fy_raw.get("end_date"))
        has_any = bool(
            fy_raw.get("start_date") or fy_raw.get("end_date") or fy_raw.get("label")
        )
        if has_any and (not sd or not ed):
            return jsonify(
                {"error": "financial_year requires valid start_date and end_date (ISO)"}
            ), 400
        if sd and ed:
            raw_ma = fy_raw.get("make_active")
            make_active = True if raw_ma is None else bool(raw_ma)
            financial_year = {
                "label": (fy_raw.get("label") or "FY").strip(),
                "start_date": sd,
                "end_date": ed,
                "make_active": make_active,
            }

    payload, error = company_service.create_company(
        g.current_user_id,
        name=name,
        legal_name=legal_name,
        financial_year=financial_year,
    )
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"company": payload}), 201


@company_bp.post("/<company_id>/financial-years")
@require_auth
def create_financial_year(company_id: str):
    body = request.get_json(silent=True) or {}

    sd = _parse_iso_date(body.get("start_date"))
    ed = _parse_iso_date(body.get("end_date"))
    if not sd or not ed:
        return jsonify({"error": "start_date and end_date must be ISO dates"}), 400

    fy, error = company_service.create_financial_year(
        g.current_user_id,
        company_id,
        label=body.get("label") or "",
        start_date=sd,
        end_date=ed,
        make_active=body.get("make_active"),
    )
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"financial_year": fy}), 201


@company_bp.patch("/<company_id>/financial-years/<fy_id>/activate")
@require_auth
def activate_financial_year(company_id: str, fy_id: str):
    fy, error = company_service.activate_financial_year(
        g.current_user_id,
        company_id,
        fy_id,
    )
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"financial_year": fy}), 200


@company_bp.get("/<company_id>/masters")
@require_auth
def masters_lookup(company_id: str):
    data, error = masters_service.lookup_all(g.current_user_id, company_id)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(data), 200


@company_bp.post("/<company_id>/items")
@require_auth
def create_item(company_id: str):
    body = request.get_json(silent=True) or {}
    row, error = masters_service.create_item(
        g.current_user_id,
        company_id,
        name=body.get("name"),
        unit=body.get("unit"),
    )
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"item": row}), 201


@company_bp.post("/<company_id>/sites")
@require_auth
def create_site(company_id: str):
    body = request.get_json(silent=True) or {}
    row, error = masters_service.create_site(
        g.current_user_id,
        company_id,
        name=body.get("name"),
        location=body.get("location"),
    )
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"site": row}), 201


@company_bp.post("/<company_id>/buyers")
@require_auth
def create_buyer(company_id: str):
    body = request.get_json(silent=True) or {}
    row, error = masters_service.create_buyer(
        g.current_user_id,
        company_id,
        name=body.get("name"),
    )
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"buyer": row}), 201
