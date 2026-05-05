from flask import Blueprint, g, jsonify, request

from ..middleware.auth_middleware import require_auth
from ..services.auth_service import AuthService

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")
auth_service = AuthService()


@auth_bp.post("/signup")
def signup():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip()
    full_name = (body.get("full_name") or "").strip()
    password = body.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    result, error = auth_service.signup(email=email, full_name=full_name, password=password)
    if error:
        return jsonify({"error": error}), 400

    return jsonify(result), 201


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    result, error = auth_service.login(email=email, password=password)
    if error:
        return jsonify({"error": error}), 401

    return jsonify(result), 200


@auth_bp.get("/me")
@require_auth
def me():
    user = auth_service.me(g.current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user}), 200
