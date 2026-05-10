from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# CUSTOMERS
# ---------------------------------------------------------------------------

class CustomerCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None
    tax_id: Optional[str] = None


class CustomerOut(CustomerCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ---------------------------------------------------------------------------
# COMMERCIAL ORDERS
# ---------------------------------------------------------------------------

class CommercialOrderCreate(BaseModel):
    customer_id: int
    delivery_requested: Optional[datetime] = None
    value: Optional[float] = None
    notes: Optional[str] = None


class CommercialOrderOut(CommercialOrderCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_date: datetime
    created_at: datetime
    customer: CustomerOut


# ---------------------------------------------------------------------------
# PROJECTS
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    order_id: int
    name: str
    project_type: str
    notes: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
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


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    project_type: str
    current_state: str
    fcs_delivery_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    order: CommercialOrderOut
    state_history: list[StateHistoryOut] = []


class ProjectListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    project_type: str
    current_state: str
    fcs_delivery_date: Optional[datetime]
    created_at: datetime
    customer_name: str = ""

    @classmethod
    def from_orm_project(cls, p: Any) -> "ProjectListItem":
        return cls(
            id=p.id,
            name=p.name,
            project_type=p.project_type,
            current_state=p.current_state,
            fcs_delivery_date=p.fcs_delivery_date,
            created_at=p.created_at,
            customer_name=p.order.customer.name if p.order and p.order.customer else "",
        )


# ---------------------------------------------------------------------------
# WORK CENTERS
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


# ---------------------------------------------------------------------------
# FCS
# ---------------------------------------------------------------------------

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
    status: str
    work_center: WorkCenterOut


class FCSSlotUpdate(BaseModel):
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


class BottleneckOut(BaseModel):
    work_center_id: int
    work_center_name: str
    utilization_pct: float
    scheduled_hours: float
    available_hours: float


# ---------------------------------------------------------------------------
# MATERIALS
# ---------------------------------------------------------------------------

class MaterialCreate(BaseModel):
    code: str
    description: str
    unit: str
    category: Optional[str] = None
    min_stock: float = 0
    is_special_order: bool = False


class MaterialOut(MaterialCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class InventoryUpdate(BaseModel):
    quantity_available: float
    quantity_reserved: Optional[float] = None
    warehouse_location: Optional[str] = None


class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    material_id: int
    quantity_available: float
    quantity_reserved: float
    warehouse_location: Optional[str]
    last_updated: datetime


class MaterialWithInventory(MaterialOut):
    inventory: Optional[InventoryOut] = None


# ---------------------------------------------------------------------------
# SUPPLIERS
# ---------------------------------------------------------------------------

class SupplierCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None
    tax_id: Optional[str] = None
    payment_terms: Optional[str] = None
    rating: float = 3.0
    notes: Optional[str] = None


class SupplierOut(SupplierCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime


class SupplierMaterialCreate(BaseModel):
    supplier_id: int
    material_id: int
    lead_time_days: int = 7
    notes: Optional[str] = None


class PriceQuoteAdd(BaseModel):
    price: float
    currency: str = "COP"
    quantity: float
    notes: Optional[str] = None


class SupplierMaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: int
    material_id: int
    lead_time_days: int
    price_history: Optional[list]
    last_quoted: Optional[datetime]
    notes: Optional[str]
    material: MaterialOut


# ---------------------------------------------------------------------------
# BOM
# ---------------------------------------------------------------------------

class BOMLineCreate(BaseModel):
    material_id: int
    quantity_required: float
    unit: str
    is_critical: bool = False
    notes: Optional[str] = None


class BOMLineOut(BOMLineCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bom_id: int
    material: MaterialOut


class BOMCreate(BaseModel):
    notes: Optional[str] = None


class BOMOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    source: str
    version: int
    is_approved: bool
    notes: Optional[str]
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


# ---------------------------------------------------------------------------
# PURCHASE REQUESTS
# ---------------------------------------------------------------------------

class PurchaseRequestCreate(BaseModel):
    project_id: int
    material_id: int
    quantity_needed: float
    urgency: str = "normal"
    notes: Optional[str] = None


class PurchaseRequestOut(PurchaseRequestCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    created_at: datetime
    material: MaterialOut


# ---------------------------------------------------------------------------
# PURCHASE ORDERS
# ---------------------------------------------------------------------------

class POLineCreate(BaseModel):
    material_id: int
    quantity: float
    unit_price: Optional[float] = None
    currency: str = "COP"
    delivery_date_expected: Optional[datetime] = None
    is_critical: bool = False
    notes: Optional[str] = None


class POLineOut(POLineCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    po_id: int
    status: str
    delivery_date_actual: Optional[datetime]
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
    project_id: Optional[int]
    status: str
    total_amount: Optional[float]
    currency: str
    notes: Optional[str]
    created_at: datetime
    supplier: SupplierOut
    lines: list[POLineOut] = []


# ---------------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    active_projects: int
    projects_by_state: dict[str, int]
    bottlenecks: list[BottleneckOut]
    critical_po_pending: int
    materials_below_min: int
