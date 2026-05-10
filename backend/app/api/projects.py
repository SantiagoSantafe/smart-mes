from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CommercialOrder, Customer, Project
from app.schemas import (
    CommercialOrderCreate,
    CommercialOrderOut,
    CustomerCreate,
    CustomerOut,
    ProjectCreate,
    ProjectListItem,
    ProjectOut,
    ProjectUpdate,
    StateTransitionRequest,
)
from app.state_machine import (
    STATE_LABELS,
    TRANSITIONS,
    TransitionBlocked,
    TransitionError,
    transition_project,
)

router = APIRouter()


# --- Customers ---

@router.get("/customers", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.name).all()


@router.post("/customers", response_model=CustomerOut, status_code=201)
def create_customer(body: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**body.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


# --- Commercial Orders ---

@router.get("/orders", response_model=list[CommercialOrderOut])
def list_orders(db: Session = Depends(get_db)):
    return (
        db.query(CommercialOrder)
        .order_by(CommercialOrder.created_at.desc())
        .all()
    )


@router.post("/orders", response_model=CommercialOrderOut, status_code=201)
def create_order(body: CommercialOrderCreate, db: Session = Depends(get_db)):
    if not db.get(Customer, body.customer_id):
        raise HTTPException(404, "Cliente no encontrado")
    order = CommercialOrder(**body.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


# --- Projects ---

@router.get("", response_model=list[ProjectListItem])
def list_projects(
    state: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Project)
    if state:
        q = q.filter(Project.current_state == state)
    projects = q.order_by(Project.created_at.desc()).all()
    return [ProjectListItem.from_orm_project(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    if not db.get(CommercialOrder, body.order_id):
        raise HTTPException(404, "Orden comercial no encontrada")
    project = Project(**body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int, body: ProjectUpdate, db: Session = Depends(get_db)
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/transition", response_model=ProjectOut)
def do_transition(
    project_id: int,
    body: StateTransitionRequest,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    try:
        project = transition_project(project, body.target_state, db, body.reason)
    except TransitionBlocked as e:
        raise HTTPException(409, str(e))
    except TransitionError as e:
        raise HTTPException(400, str(e))
    return project


@router.get("/{project_id}/allowed-transitions")
def allowed_transitions(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    states = TRANSITIONS.get(project.current_state, [])
    return [{"state": s, "label": STATE_LABELS.get(s, s)} for s in states]


@router.get("/states/labels")
def state_labels():
    return STATE_LABELS
