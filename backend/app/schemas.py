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


# ---------------------------------------------------------------------------
# PURCHASING
# ---------------------------------------------------------------------------

class MaterialCreate(BaseModel):
    code: str
    description: str
    unit: str = "und"
    category: Optional[str] = None
    min_stock: float = 0.0


class MaterialOut(MaterialCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    material_id: int
    quantity_available: float
    quantity_reserved: float
    warehouse_location: Optional[str]
    updated_at: datetime


class InventoryUpdate(BaseModel):
    quantity_available: float
    quantity_reserved: Optional[float] = None
    warehouse_location: Optional[str] = None


class MaterialWithInventory(MaterialOut):
    inventory: Optional[InventoryOut] = None


class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None


class SupplierOut(SupplierCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool


class SupplierMaterialCreate(BaseModel):
    supplier_id: int
    material_id: int
    lead_time_days: Optional[int] = None


class SupplierMaterialOut(SupplierMaterialCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    price_history: list = []
    last_quoted: Optional[datetime] = None


class PriceQuoteAdd(BaseModel):
    price: float
    currency: str = "COP"
    quantity: Optional[float] = None
    notes: Optional[str] = None


class POLineCreate(BaseModel):
    material_id: int
    quantity: float
    unit_price: Optional[float] = None
    delivery_date_expected: Optional[datetime] = None
    is_critical: bool = False


class POLineOut(POLineCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    po_id: int
    currency: str
    delivery_date_actual: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    material: MaterialOut


class POLineStatusUpdate(BaseModel):
    status: str
    delivery_date_actual: Optional[datetime] = None
    notes: Optional[str] = None


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    project_id: Optional[int] = None
    currency: str = "COP"
    notes: Optional[str] = None
    lines: list[POLineCreate] = []


class PurchaseOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: int
    supplier: SupplierOut
    project_id: Optional[int]
    currency: str
    status: str
    total_amount: Optional[float]
    notes: Optional[str]
    created_at: datetime
    lines: list[POLineOut] = []


class PurchaseRequestCreate(BaseModel):
    project_id: Optional[int] = None
    material_id: int
    quantity_requested: float
    notes: Optional[str] = None


class PurchaseRequestOut(PurchaseRequestCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    created_at: datetime


class BOMLineCreate(BaseModel):
    material_id: int
    quantity_required: float
    unit: str = "und"
    is_critical: bool = False
    notes: Optional[str] = None


class BOMLineOut(BOMLineCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bom_id: int
    material: MaterialOut


class BOMCreate(BaseModel):
    notes: Optional[str] = None


class BOMOut(BOMCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    is_approved: bool
    created_at: datetime
    lines: list[BOMLineOut] = []


class BOMInventoryCheck(BaseModel):
    line_id: int
    material_code: str
    material_description: str
    quantity_required: float
    quantity_available: float
    shortfall: float
    is_critical: bool
    status: str
