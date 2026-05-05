import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    APP_ENV = os.getenv("APP_ENV", "development")
    APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT = int(os.getenv("APP_PORT", "8000"))

    DATABASE_URL = os.getenv("DATABASE_URL", "")
    SUPABASE_URL = (os.getenv("SUPABASE_URL", "") or "").strip()
    SUPABASE_ANON_KEY = (os.getenv("SUPABASE_ANON_KEY", "") or "").strip()
    # Supabase Dashboard → Settings → API → JWT Secret (Signing secret).
    SUPABASE_JWT_SECRET = (os.getenv("SUPABASE_JWT_SECRET", "") or "").strip().strip("\"'")

    # Accepted clock skew for JWT exp / nbf validation (seconds).
    JWT_DECODE_LEEWAY_SECONDS = int(os.getenv("JWT_DECODE_LEEWAY_SECONDS", "120"))
