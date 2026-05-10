import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.api import auth, fcs, projects, purchasing, workcenters

logger = logging.getLogger(__name__)

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.error("Error creating DB tables: %s", e)

app = FastAPI(title="Smart MES", version="2.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(workcenters.router, prefix="/api/areas", tags=["areas"])
app.include_router(fcs.router, prefix="/api/fcs", tags=["fcs"])
app.include_router(purchasing.router, prefix="/api/purchasing", tags=["purchasing"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
