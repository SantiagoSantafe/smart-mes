from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# CUSTOMERS / COMMERCIAL ORDERS
# ---------------------------------------------------------------------------

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    contact_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    orders: Mapped[list["CommercialOrder"]] = relationship(back_populates="customer")


class CommercialOrder(Base):
    __tablename__ = "commercial_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    delivery_requested: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="orders")
    projects: Mapped[list["Project"]] = relationship(back_populates="order")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("commercial_orders.id"))
    name: Mapped[str] = mapped_column(String(200))
    project_type: Mapped[str] = mapped_column(String(50))
    current_state: Mapped[str] = mapped_column(String(50), default="commercial_order")
    fcs_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    order: Mapped["CommercialOrder"] = relationship(back_populates="projects")
    state_history: Mapped[list["ProjectStateHistory"]] = relationship(
        back_populates="project", order_by="ProjectStateHistory.changed_at"
    )
    fcs_slots: Mapped[list["FCSScheduleSlot"]] = relationship(
        back_populates="project", order_by="FCSScheduleSlot.planned_start"
    )
    bom: Mapped[Optional["BOM"]] = relationship(back_populates="project", uselist=False)
    purchase_requests: Mapped[list["PurchaseRequest"]] = relationship(back_populates="project")
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="project")


class ProjectStateHistory(Base):
    __tablename__ = "project_state_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    from_state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_state: Mapped[str] = mapped_column(String(50))
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="state_history")


# ---------------------------------------------------------------------------
# WORK CENTERS / FCS
# ---------------------------------------------------------------------------

class WorkCenter(Base):
    __tablename__ = "work_centers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hours_per_day: Mapped[float] = mapped_column(Float, default=8.0)
    work_start_hour: Mapped[int] = mapped_column(Integer, default=8)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    route_steps: Mapped[list["RouteStep"]] = relationship(back_populates="work_center")
    fcs_slots: Mapped[list["FCSScheduleSlot"]] = relationship(back_populates="work_center")


class ProcessRoute(Base):
    __tablename__ = "process_routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    project_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    steps: Mapped[list["RouteStep"]] = relationship(
        back_populates="route", order_by="RouteStep.step_order"
    )


class RouteStep(Base):
    __tablename__ = "route_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("process_routes.id"))
    work_center_id: Mapped[int] = mapped_column(ForeignKey("work_centers.id"))
    step_order: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(200))
    estimated_hours: Mapped[float] = mapped_column(Float)
    can_parallel: Mapped[bool] = mapped_column(Boolean, default=False)
    depends_on_step_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("route_steps.id"), nullable=True
    )

    route: Mapped["ProcessRoute"] = relationship(back_populates="steps")
    work_center: Mapped["WorkCenter"] = relationship(back_populates="route_steps")


class FCSScheduleSlot(Base):
    __tablename__ = "fcs_schedule_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    work_center_id: Mapped[int] = mapped_column(ForeignKey("work_centers.id"))
    route_step_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("route_steps.id"), nullable=True
    )
    step_name: Mapped[str] = mapped_column(String(200))
    planned_start: Mapped[datetime] = mapped_column(DateTime)
    planned_end: Mapped[datetime] = mapped_column(DateTime)
    actual_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="planned")

    project: Mapped["Project"] = relationship(back_populates="fcs_slots")
    work_center: Mapped["WorkCenter"] = relationship(back_populates="fcs_slots")


# ---------------------------------------------------------------------------
# MATERIALS / INVENTORY
# ---------------------------------------------------------------------------

class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str] = mapped_column(String(300))
    unit: Mapped[str] = mapped_column(String(20))
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    min_stock: Mapped[float] = mapped_column(Float, default=0)
    is_special_order: Mapped[bool] = mapped_column(Boolean, default=False)

    inventory: Mapped[Optional["InventoryRecord"]] = relationship(
        back_populates="material", uselist=False
    )
    bom_lines: Mapped[list["BOMLine"]] = relationship(back_populates="material")
    supplier_materials: Mapped[list["SupplierMaterial"]] = relationship(
        back_populates="material"
    )
    purchase_requests: Mapped[list["PurchaseRequest"]] = relationship(
        back_populates="material"
    )


class InventoryRecord(Base):
    __tablename__ = "inventory_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"), unique=True)
    quantity_available: Mapped[float] = mapped_column(Float, default=0)
    quantity_reserved: Mapped[float] = mapped_column(Float, default=0)
    warehouse_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    material: Mapped["Material"] = relationship(back_populates="inventory")


# ---------------------------------------------------------------------------
# SUPPLIERS / PURCHASING
# ---------------------------------------------------------------------------

class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    contact_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=3.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    supplier_materials: Mapped[list["SupplierMaterial"]] = relationship(
        back_populates="supplier"
    )
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="supplier")


class SupplierMaterial(Base):
    __tablename__ = "supplier_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    lead_time_days: Mapped[int] = mapped_column(Integer, default=7)
    price_history: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    last_quoted: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    supplier: Mapped["Supplier"] = relationship(back_populates="supplier_materials")
    material: Mapped["Material"] = relationship(back_populates="supplier_materials")


class BOM(Base):
    __tablename__ = "boms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="bom")
    lines: Mapped[list["BOMLine"]] = relationship(back_populates="bom")


class BOMLine(Base):
    __tablename__ = "bom_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bom_id: Mapped[int] = mapped_column(ForeignKey("boms.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity_required: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    bom: Mapped["BOM"] = relationship(back_populates="lines")
    material: Mapped["Material"] = relationship(back_populates="bom_lines")


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity_needed: Mapped[float] = mapped_column(Float)
    urgency: Mapped[str] = mapped_column(String(20), default="normal")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="purchase_requests")
    material: Mapped["Material"] = relationship(back_populates="purchase_requests")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    project_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projects.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    total_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="COP")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    supplier: Mapped["Supplier"] = relationship(back_populates="purchase_orders")
    project: Mapped[Optional["Project"]] = relationship(back_populates="purchase_orders")
    lines: Mapped[list["POLine"]] = relationship(back_populates="purchase_order")


class POLine(Base):
    __tablename__ = "po_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity: Mapped[float] = mapped_column(Float)
    unit_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="COP")
    delivery_date_expected: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivery_date_actual: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="lines")
    material: Mapped["Material"] = relationship()
