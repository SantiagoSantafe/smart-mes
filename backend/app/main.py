from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.api import auth, fcs, projects, workcenters

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart MES", version="2.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",
        "https://smart-mes-ten.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(workcenters.router, prefix="/api/areas", tags=["areas"])
app.include_router(fcs.router, prefix="/api/fcs", tags=["fcs"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
