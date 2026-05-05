import jwt
from jwt import PyJWKClient

from ..config import Config

# Reuse JWKS client (fetches keys once, caches by kid).
_jwks_clients: dict[str, PyJWKClient] = {}


def _auth_issuer() -> str | None:
    base = (Config.SUPABASE_URL or "").rstrip("/")
    if not base:
        return None
    return f"{base}/auth/v1"


def _jwks_client() -> PyJWKClient:
    if not Config.SUPABASE_URL:
        raise jwt.InvalidTokenError(
            "SUPABASE_URL is required to verify ES256/RS256 Supabase JWTs"
        )
    jwks_url = f"{Config.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    if jwks_url not in _jwks_clients:
        _jwks_clients[jwks_url] = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_clients[jwks_url]


def decode_access_token(token: str) -> dict:
    """
    Supabase may issue either:
    - HS256 tokens (verify with SUPABASE_JWT_SECRET), or
    - ES256/RS256 tokens (verify with OIDC JWKS from the project).
    """
    header = jwt.get_unverified_header(token)
    alg = (header.get("alg") or "HS256").upper()
    leeway = int(Config.JWT_DECODE_LEEWAY_SECONDS)
    decode_opts = {"verify_aud": False}

    if alg == "HS256":
        if not Config.SUPABASE_JWT_SECRET:
            raise jwt.InvalidTokenError(
                "JWT uses HS256 but SUPABASE_JWT_SECRET is not configured"
            )
        return jwt.decode(
            token,
            Config.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options=decode_opts,
            leeway=leeway,
        )

    if alg in ("ES256", "RS256"):
        iss = _auth_issuer()
        try:
            jwks = _jwks_client()
            signing_key = jwks.get_signing_key_from_jwt(token)
        except Exception as e:
            raise jwt.InvalidTokenError(f"Could not load signing key ({e})") from e

        kwargs: dict = {
            "algorithms": [alg],
            "options": decode_opts,
            "leeway": leeway,
        }
        if iss:
            kwargs["issuer"] = iss
        return jwt.decode(token, signing_key.key, **kwargs)

    raise jwt.InvalidTokenError(f"Unsupported JWT algorithm: {alg}")
