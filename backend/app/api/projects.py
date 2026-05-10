from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import require_auth
from app.database import get_db
from app.fcs_engine import get_bottlenecks
from app.models import MaterialPlan, MaterialPlanLine, Project
from app.schemas import (
    KanbanCard,
    KanbanColumn,
    MaterialPlanCreate,
    MaterialPlanLineCreate,
    MaterialPlanLineOut,
    MaterialPlanLineUpdate,
    MaterialPlanOut,
    ProjectCreate,
    ProjectListItem,
    ProjectOut,
    ProjectUpdate,
    StateTransitionRequest,
)
from app.state_machine import (
    STATE_LABELS,
    STATES_ORDERED,
    TRANSITIONS,
    TransitionBlocked,
    TransitionError,
    transition_project,
)

router = APIRouter()

PROJECT_TYPES = ["metalmecanica", "carpinteria", "pintura", "ensamble", "mixto"]


# ---------------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _=Depends(require_auth)):
    projects = db.query(Project).all()
    active = [p for p in projects if p.current_state != "entrega"]

    columns: list[KanbanColumn] = []
    for state in STATES_ORDERED:
        state_projects = [p for p in projects if p.current_state == state]
        cards: list[KanbanCard] = []
        for p in state_projects:
            plan = p.material_plan
            total = len(plan.lines) if plan else 0
            received = sum(1 for l in plan.lines if l.is_received) if plan else 0
            cards.append(
                KanbanCard(
                    id=p.id,
                    name=p.name,
                    client_name=p.client_name,
                    project_number=p.project_number,
                    project_type=p.project_type,
                    current_state=p.current_state,
                    fcs_delivery_date=p.fcs_delivery_date,
                    start_date=p.start_date,
                    approval_date=p.approval_date,
                    materials_total=total,
                    materials_received=received,
                )
            )
        columns.append(
            KanbanColumn(state=state, label=STATE_LABELS[state], cards=cards)
        )

    materials_pending = (
        db.query(MaterialPlanLine)
        .filter(MaterialPlanLine.is_received.is_(False))
        .count()
    )

    return {
        "active_projects": len(active),
        "materials_pending": materials_pending,
        "bottlenecks": get_bottlenecks(db, window_days=14),
        "kanban": columns,
    }


# ---------------------------------------------------------------------------
# PROJECTS CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ProjectListItem])
def list_projects(
    state: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    q = db.query(Project)
    if state:
        q = q.filter(Project.current_state == state)
    return q.order_by(Project.created_at.desc()).all()


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    project = Project(**body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/states/labels")
def state_labels(_=Depends(require_auth)):
    return STATE_LABELS


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    return p


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.post("/{project_id}/transition", response_model=ProjectOut)
def do_transition(
    project_id: int,
    body: StateTransitionRequest,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    try:
        p = transition_project(p, body.target_state, db, body.reason)
    except TransitionBlocked as e:
        raise HTTPException(409, str(e))
    except TransitionError as e:
        raise HTTPException(400, str(e))
    return p


@router.get("/{project_id}/allowed-transitions")
def allowed_transitions(
    project_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    states = TRANSITIONS.get(p.current_state, [])
    return [{"state": s, "label": STATE_LABELS.get(s, s)} for s in states]


# ---------------------------------------------------------------------------
# MATERIAL PLAN
# ---------------------------------------------------------------------------

@router.get("/{project_id}/plan", response_model=MaterialPlanOut)
def get_plan(
    project_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    plan = db.query(MaterialPlan).filter(MaterialPlan.project_id == project_id).first()
    if not plan:
        raise HTTPException(404, "Plan de materiales no encontrado")
    return plan


@router.post("/{project_id}/plan", response_model=MaterialPlanOut, status_code=201)
def create_plan(
    project_id: int,
    body: MaterialPlanCreate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Proyecto no encontrado")
    if db.query(MaterialPlan).filter(MaterialPlan.project_id == project_id).first():
        raise HTTPException(400, "Ya existe un plan para este proyecto")
    plan = MaterialPlan(project_id=project_id, **body.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/{project_id}/plan/lines", response_model=MaterialPlanLineOut, status_code=201)
def add_plan_line(
    project_id: int,
    body: MaterialPlanLineCreate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    plan = db.query(MaterialPlan).filter(MaterialPlan.project_id == project_id).first()
    if not plan:
        raise HTTPException(404, "Plan no encontrado. Créalo primero.")
    line = MaterialPlanLine(plan_id=plan.id, **body.model_dump())
    db.add(line)
    db.commit()
    db.refresh(line)
    return line


@router.patch("/{project_id}/plan/lines/{line_id}", response_model=MaterialPlanLineOut)
def update_plan_line(
    project_id: int,
    line_id: int,
    body: MaterialPlanLineUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    plan = db.query(MaterialPlan).filter(MaterialPlan.project_id == project_id).first()
    if not plan:
        raise HTTPException(404, "Plan no encontrado")
    line = db.get(MaterialPlanLine, line_id)
    if not line or line.plan_id != plan.id:
        raise HTTPException(404, "Línea no encontrada")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(line, field, value)

    # Set received timestamp when marking as received
    if body.is_received is True and not line.received_at:
        line.received_at = datetime.utcnow()
    elif body.is_received is False:
        line.received_at = None

    db.commit()
    db.refresh(line)
    return line


@router.delete("/{project_id}/plan/lines/{line_id}", status_code=204)
def delete_plan_line(
    project_id: int,
    line_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_auth),
):
    plan = db.query(MaterialPlan).filter(MaterialPlan.project_id == project_id).first()
    if not plan:
        raise HTTPException(404, "Plan no encontrado")
    line = db.get(MaterialPlanLine, line_id)
    if not line or line.plan_id != plan.id:
        raise HTTPException(404, "Línea no encontrada")
    db.delete(line)
    db.commit()
