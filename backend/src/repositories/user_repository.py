from ..db import get_db_session
from ..models import AppUser


class UserRepository:
    def get_by_id(self, user_id: str):
        with get_db_session() as session:
            user = session.query(AppUser).filter(AppUser.id == user_id).first()
            if not user:
                return None
            return {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
            }

    def upsert_user(self, user_id: str, email: str, full_name: str):
        with get_db_session() as session:
            user = session.query(AppUser).filter(AppUser.id == user_id).first()
            if user is None:
                user = AppUser(id=user_id, email=email, full_name=full_name or "")
                session.add(user)
                session.flush()
            else:
                user.email = email
                user.full_name = full_name or user.full_name
                session.flush()

            return {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
