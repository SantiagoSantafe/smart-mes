from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.fcs_engine import get_bottlenecks, schedule_project
from app.models import FCSScheduleSlot, Project, WorkCenter
from app.schemas import BottleneckOut, FCSSlotOut, FCSSlotUpdate, GanttTask

router = APIRouter()


@router.post("/schedule/{project_id}", response_model=list[FCSSlotOut])
def run_fcs(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    slots = schedule_project(db, project)
    return slots


@router.get("/gantt", response_model=list[GanttTask])
def gantt_data(
    state: str | None = None,
    db: Session = Depends(get_db),
):
    q = (
        db.query(FCSScheduleSlot)
        .join(FCSScheduleSlot.project)
        .join(FCSScheduleSlot.work_center)
        .filter(FCSScheduleSlot.status.notin_(["done"]))
    )
    if state:
        q = q.filter(Project.current_state == state)

    slots = q.order_by(FCSScheduleSlot.planned_start).all()

    return [
        GanttTask(
            id=f"slot-{s.id}",
            project_id=s.project_id,
            project_name=s.project.name,
            work_center=s.work_center.name,
            step_name=s.step_name,
            start=s.planned_start.isoformat(),
            end=s.planned_end.isoformat(),
            status=s.status,
            current_state=s.project.current_state,
        )
        for s in slots
    ]


@router.get("/bottlenecks", response_model=list[BottleneckOut])
def bottleneck_report(
    window_days: int = 14,
    db: Session = Depends(get_db),
):
    return get_bottlenecks(db, window_days)


@router.patch("/slots/{slot_id}", response_model=FCSSlotOut)
def update_slot(
    slot_id: int,
    body: FCSSlotUpdate,
    db: Session = Depends(get_db),
):
    slot = db.get(FCSScheduleSlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(slot, field, value)
    db.commit()
    db.refresh(slot)
    return slot


@router.get("/workcenters/load")
def workcenters_load(
    window_days: int = 14,
    db: Session = Depends(get_db),
):
    return get_bottlenecks(db, window_days)
