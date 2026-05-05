from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import Config

engine = create_engine(Config.DATABASE_URL, future=True, pool_pre_ping=True)
# Repos return ORM rows after the context exits; avoid expiring attributes on
# commit so plain reads (name, id, …) work on detached instances until GC.
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True,
    expire_on_commit=False,
)


@contextmanager
def get_db_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
