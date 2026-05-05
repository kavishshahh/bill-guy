import requests

from ..config import Config
from ..repositories.user_repository import UserRepository


class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.base_auth_url = f"{Config.SUPABASE_URL}/auth/v1"
        self.headers = {
            "apikey": Config.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }

    def signup(self, email: str, full_name: str, password: str):
        payload = {
            "email": email,
            "password": password,
            "data": {"full_name": full_name},
        }
        response = requests.post(
            f"{self.base_auth_url}/signup",
            headers=self.headers,
            json=payload,
            timeout=30,
        )
        print("Supabase response:", response.status_code, response.text, response.json())
        if response.status_code >= 400:
            return None, response.json().get("msg", "Supabase signup failed")

        data = response.json()
        user_data = data.get("user")
        if user_data:
            self.user_repo.upsert_user(
                user_id=user_data["id"],
                email=user_data.get("email") or email,
                full_name=(user_data.get("user_metadata") or {}).get("full_name", full_name),
            )
        return data, None

    def login(self, email: str, password: str):
        response = requests.post(
            f"{self.base_auth_url}/token?grant_type=password",
            headers=self.headers,
            json={"email": email, "password": password},
            timeout=30,
        )
        print("Supabase response:", response.status_code, response.text, response.json())
        if response.status_code >= 400:
            return None, response.json().get("msg", "Invalid email or password")

        data = response.json()
        user_data = data.get("user")
        if user_data:
            self.user_repo.upsert_user(
                user_id=user_data["id"],
                email=user_data.get("email") or email,
                full_name=(user_data.get("user_metadata") or {}).get("full_name", ""),
            )
        return data, None

    def me(self, user_id: str):
        return self.user_repo.get_by_id(user_id)
