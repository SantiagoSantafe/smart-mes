from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import require_auth
from app.database import get_db
from app.models import ProcessRoute, RouteStep, WorkCenter
from app.schemas import (
    ProcessRouteCreate,
    ProcessRouteOut,
    RouteStepCreate,
    RouteStepOut,
    WorkCenterCreate,
    WorkCenterOut,
)

router = APIRouter()


@router.get("", response_model=list[WorkCenterOut])
def list_areas(db: Session = Depends(get_db), _=Depends(require_auth)):
    return db.query(WorkCenter).order_by(WorkCenter.name).all()


@router.post("", response_model=WorkCenterOut, status_code=201)
def create_area(
    body: WorkCenterCreate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    wc = WorkCenter(**body.model_dump())
    db.add(wc)
    db.commit()
    db.refresh(wc)
    return wc


@router.patch("/{wc_id}", response_model=WorkCenterOut)
def update_area(
    wc_id: int,
    body: WorkCenterCreate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    wc = db.get(WorkCenter, wc_id)
    if not wc:
        raise HTTPException(404, "Área no encontrada")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(wc, field, value)
    db.commit()
    db.refresh(wc)
    return wc


@router.delete("/{wc_id}", status_code=204)
def deactivate_area(
    wc_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    wc = db.get(WorkCenter, wc_id)
    if not wc:
        raise HTTPException(404, "Área no encontrada")
    wc.is_active = False
    db.commit()


@router.get("/routes", response_model=list[ProcessRouteOut])
def list_routes(db: Session = Depends(get_db), _=Depends(require_auth)):
    return db.query(ProcessRoute).order_by(ProcessRoute.project_type).all()


@router.post("/routes", response_model=ProcessRouteOut, status_code=201)
def create_route(
    body: ProcessRouteCreate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    route = ProcessRoute(**body.model_dump())
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@router.post("/routes/{route_id}/steps", response_model=RouteStepOut, status_code=201)
def add_step(
    route_id: int,
    body: RouteStepCreate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    if not db.get(ProcessRoute, route_id):
        raise HTTPException(404, "Ruta no encontrada")
    if not db.get(WorkCenter, body.work_center_id):
        raise HTTPException(404, "Área no encontrada")
    step = RouteStep(route_id=route_id, **body.model_dump())
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


@router.delete("/routes/{route_id}/steps/{step_id}", status_code=204)
def delete_step(
    route_id: int,
    step_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    step = db.get(RouteStep, step_id)
    if not step or step.route_id != route_id:
        raise HTTPException(404, "Paso no encontrado")
    db.delete(step)
    db.commit()
