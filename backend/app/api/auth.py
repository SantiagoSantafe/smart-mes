from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings

router = APIRouter()

# Hard-coded credentials — single coordinator
VALID_EMAIL = "faustinosantafecorrea@gmail.com"
VALID_PASSWORD = "papafaustinosantafe@2026"

# The token is the SECRET_KEY; simple but sufficient for single-user
def get_token() -> str:
    return settings.SECRET_KEY


_bearer = HTTPBearer(auto_error=False)


def require_auth(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)):
    if not credentials or credentials.credentials != get_token():
        raise HTTPException(status_code=401, detail="No autorizado")


@router.post("/login")
def login(body: dict):
    email = body.get("email", "")
    password = body.get("password", "")
    if email != VALID_EMAIL or password != VALID_PASSWORD:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"access_token": get_token(), "token_type": "bearer"}
