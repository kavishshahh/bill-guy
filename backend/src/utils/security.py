import jwt

from ..config import Config


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        Config.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )
