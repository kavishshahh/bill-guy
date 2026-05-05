from functools import wraps

from flask import g, jsonify, request
import jwt

from ..utils.security import decode_access_token


def require_auth(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing bearer token"}), 401

        token = auth_header.replace("Bearer ", "", 1).strip()
        try:
            payload = decode_access_token(token)
            g.current_user_id = payload["sub"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return handler(*args, **kwargs)

    return wrapper
