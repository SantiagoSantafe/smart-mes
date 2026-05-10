from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# PROJECTS
# ---------------------------------------------------------------------------

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    client_name: Mapped[str] = mapped_column(String(200))
    project_number: Mapped[str] = mapped_column(String(100))
    project_type: Mapped[str] = mapped_column(String(50))
    current_state: Mapped[str] = mapped_column(String(50), default="entrada_informacion")
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approval_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    fcs_delivery_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    state_history: Mapped[list["ProjectStateHistory"]] = relationship(
        back_populates="project", order_by="ProjectStateHistory.changed_at"
    )
    fcs_slots: Mapped[list["FCSScheduleSlot"]] = relationship(
        back_populates="project", order_by="FCSScheduleSlot.planned_start"
    )
    material_plan: Mapped[Optional["MaterialPlan"]] = relationship(
        back_populates="project", uselist=False
    )


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
# MATERIAL PLAN (replaces BOM)
# ---------------------------------------------------------------------------

class MaterialPlan(Base):
    __tablename__ = "material_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="material_plan")
    lines: Mapped[list["MaterialPlanLine"]] = relationship(
        back_populates="plan", order_by="MaterialPlanLine.id"
    )


class MaterialPlanLine(Base):
    __tablename__ = "material_plan_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("material_plans.id"))
    material_type: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(300))
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="und")
    supplier_name: Mapped[str] = mapped_column(String(200), default="")
    is_received: Mapped[bool] = mapped_column(Boolean, default=False)
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    plan: Mapped["MaterialPlan"] = relationship(back_populates="lines")


# ---------------------------------------------------------------------------
# WORK AREAS / FCS
# ---------------------------------------------------------------------------

class WorkCenter(Base):
    """Modelo interno — se muestra como 'Área de Trabajo' en la UI."""
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
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="planned")

    project: Mapped["Project"] = relationship(back_populates="fcs_slots")
    work_center: Mapped["WorkCenter"] = relationship(back_populates="fcs_slots")
