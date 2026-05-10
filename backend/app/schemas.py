from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# PROJECTS
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    name: str
    client_name: str
    project_number: str
    project_type: str
    start_date: Optional[datetime] = None
    approval_date: Optional[datetime] = None
    notes: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    project_number: Optional[str] = None
    project_type: Optional[str] = None
    start_date: Optional[datetime] = None
    approval_date: Optional[datetime] = None
    notes: Optional[str] = None


class StateTransitionRequest(BaseModel):
    target_state: str
    reason: Optional[str] = None


class StateHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_state: Optional[str]
    to_state: str
    reason: Optional[str]
    changed_at: datetime


class ProjectListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    client_name: str
    project_number: str
    project_type: str
    current_state: str
    start_date: Optional[datetime]
    approval_date: Optional[datetime]
    fcs_delivery_date: Optional[datetime]
    created_at: datetime


class ProjectOut(ProjectListItem):
    notes: Optional[str]
    updated_at: datetime
    state_history: list[StateHistoryOut] = []


# ---------------------------------------------------------------------------
# MATERIAL PLAN
# ---------------------------------------------------------------------------

class MaterialPlanLineCreate(BaseModel):
    material_type: str
    description: str
    quantity: float
    unit: str = "und"
    supplier_name: str = ""
    notes: Optional[str] = None


class MaterialPlanLineUpdate(BaseModel):
    material_type: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    supplier_name: Optional[str] = None
    is_received: Optional[bool] = None
    notes: Optional[str] = None


class MaterialPlanLineOut(MaterialPlanLineCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plan_id: int
    is_received: bool
    received_at: Optional[datetime]


class MaterialPlanCreate(BaseModel):
    notes: Optional[str] = None


class MaterialPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    notes: Optional[str]
    created_at: datetime
    lines: list[MaterialPlanLineOut] = []


# ---------------------------------------------------------------------------
# WORK AREAS / FCS
# ---------------------------------------------------------------------------

class WorkCenterCreate(BaseModel):
    name: str
    description: Optional[str] = None
    hours_per_day: float = 8.0
    work_start_hour: int = 8


class WorkCenterOut(WorkCenterCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool


class RouteStepCreate(BaseModel):
    work_center_id: int
    step_order: int
    name: str
    estimated_hours: float
    can_parallel: bool = False
    depends_on_step_id: Optional[int] = None


class RouteStepOut(RouteStepCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    route_id: int
    work_center: WorkCenterOut


class ProcessRouteCreate(BaseModel):
    name: str
    project_type: str
    description: Optional[str] = None


class ProcessRouteOut(ProcessRouteCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    steps: list[RouteStepOut] = []


class FCSSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    work_center_id: int
    step_name: str
    planned_start: datetime
    planned_end: datetime
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    is_manual: bool
    status: str
    work_center: WorkCenterOut


class FCSSlotManualUpdate(BaseModel):
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    status: Optional[str] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None


class GanttTask(BaseModel):
    id: str
    project_id: int
    project_name: str
    work_center: str
    step_name: str
    start: str
    end: str
    status: str
    current_state: str
    is_manual: bool


class BottleneckOut(BaseModel):
    work_center_id: int
    work_center_name: str
    utilization_pct: float
    scheduled_hours: float
    available_hours: float


# ---------------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------------

class KanbanCard(BaseModel):
    id: int
    name: str
    client_name: str
    project_number: str
    project_type: str
    current_state: str
    fcs_delivery_date: Optional[datetime]
    start_date: Optional[datetime]
    approval_date: Optional[datetime]
    materials_total: int = 0
    materials_received: int = 0


class KanbanColumn(BaseModel):
    state: str
    label: str
    cards: list[KanbanCard]


class DashboardStats(BaseModel):
    active_projects: int
    bottlenecks: list[BottleneckOut]
    materials_pending: int
    kanban: list[KanbanColumn]
