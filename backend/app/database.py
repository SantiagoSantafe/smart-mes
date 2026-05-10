from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

# Supabase requiere SSL; psycopg2 lo respeta si viene en la URL
# Si no viene en la URL, lo forzamos via connect_args
_url = settings.DATABASE_URL
_connect_args: dict = {}
if "sslmode" not in _url and ("supabase" in _url or "pooler" in _url):
    _connect_args = {"sslmode": "require"}

engine = create_engine(_url, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
