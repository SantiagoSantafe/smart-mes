from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import FCSScheduleSlot, ProcessRoute, Project, WorkCenter

WORKING_DAYS = {0, 1, 2, 3, 4}  # Mon–Fri


def _is_working_day(dt: datetime) -> bool:
    return dt.weekday() in WORKING_DAYS


def _next_working_start(dt: datetime, wc: WorkCenter) -> datetime:
    start_h = wc.work_start_hour
    end_h = start_h + wc.hours_per_day

    while not _is_working_day(dt):
        dt = (dt + timedelta(days=1)).replace(
            hour=start_h, minute=0, second=0, microsecond=0
        )

    if dt.hour < start_h:
        dt = dt.replace(hour=start_h, minute=0, second=0, microsecond=0)
    elif dt.hour >= end_h or (dt.hour == int(end_h) and dt.minute > 0):
        dt = (dt + timedelta(days=1)).replace(
            hour=start_h, minute=0, second=0, microsecond=0
        )
        while not _is_working_day(dt):
            dt += timedelta(days=1)

    return dt


def _add_working_hours(start: datetime, hours: float, wc: WorkCenter) -> datetime:
    start_h = wc.work_start_hour
    end_h = start_h + wc.hours_per_day
    current = start
    remaining = hours

    while remaining > 0:
        end_today = current.replace(
            hour=int(end_h), minute=int((end_h % 1) * 60), second=0, microsecond=0
        )
        available_today = max(0.0, (end_today - current).total_seconds() / 3600)

        if remaining <= available_today:
            current = current + timedelta(hours=remaining)
            remaining = 0
        else:
            remaining -= available_today
            next_day = (current + timedelta(days=1)).replace(
                hour=start_h, minute=0, second=0, microsecond=0
            )
            while not _is_working_day(next_day):
                next_day += timedelta(days=1)
            current = next_day

    return current


def _find_next_slot(
    db: Session,
    wc: WorkCenter,
    duration_hours: float,
    not_before: datetime,
) -> tuple[datetime, datetime]:
    existing = (
        db.query(FCSScheduleSlot)
        .filter(
            FCSScheduleSlot.work_center_id == wc.id,
            FCSScheduleSlot.status.notin_(["done"]),
            FCSScheduleSlot.planned_end >= not_before,
        )
        .order_by(FCSScheduleSlot.planned_start)
        .all()
    )

    cursor = _next_working_start(not_before, wc)

    for slot in existing:
        if slot.planned_start <= cursor:
            if slot.planned_end > cursor:
                cursor = _next_working_start(slot.planned_end, wc)
            continue

        test_end = _add_working_hours(cursor, duration_hours, wc)
        if test_end <= slot.planned_start:
            return cursor, test_end

        cursor = _next_working_start(slot.planned_end, wc)

    end = _add_working_hours(cursor, duration_hours, wc)
    return cursor, end


def schedule_project(db: Session, project: Project) -> list[FCSScheduleSlot]:
    db.query(FCSScheduleSlot).filter(
        FCSScheduleSlot.project_id == project.id,
        FCSScheduleSlot.status == "planned",
    ).delete()

    route = (
        db.query(ProcessRoute)
        .filter(
            ProcessRoute.project_type == project.project_type,
            ProcessRoute.is_active.is_(True),
        )
        .first()
    )
    if not route:
        db.commit()
        return []

    created_slots: list[FCSScheduleSlot] = []
    step_end_times: dict[int, datetime] = {}
    now = datetime.utcnow()

    for step in route.steps:
        not_before = now

        if step.depends_on_step_id and step.depends_on_step_id in step_end_times:
            not_before = max(not_before, step_end_times[step.depends_on_step_id])
        elif step.step_order > 1 and not step.can_parallel and created_slots:
            not_before = max(not_before, created_slots[-1].planned_end)

        wc = step.work_center
        slot_start, slot_end = _find_next_slot(
            db=db,
            wc=wc,
            duration_hours=step.estimated_hours,
            not_before=not_before,
        )

        slot = FCSScheduleSlot(
            project_id=project.id,
            work_center_id=wc.id,
            route_step_id=step.id,
            step_name=step.name,
            planned_start=slot_start,
            planned_end=slot_end,
            status="planned",
        )
        db.add(slot)
        db.flush()

        step_end_times[step.id] = slot_end
        created_slots.append(slot)

    if created_slots:
        project.fcs_delivery_date = created_slots[-1].planned_end

    db.commit()
    return created_slots


def get_bottlenecks(db: Session, window_days: int = 14) -> list[dict]:
    window_start = datetime.utcnow()
    window_end = window_start + timedelta(days=window_days)

    work_centers = db.query(WorkCenter).filter(WorkCenter.is_active.is_(True)).all()
    bottlenecks = []

    for wc in work_centers:
        available_hours = 0.0
        cursor = window_start
        while cursor < window_end:
            if _is_working_day(cursor):
                available_hours += wc.hours_per_day
            cursor += timedelta(days=1)

        if available_hours == 0:
            continue

        slots = (
            db.query(FCSScheduleSlot)
            .filter(
                FCSScheduleSlot.work_center_id == wc.id,
                FCSScheduleSlot.status.notin_(["done"]),
                FCSScheduleSlot.planned_start < window_end,
                FCSScheduleSlot.planned_end > window_start,
            )
            .all()
        )

        scheduled_hours = sum(
            (
                min(s.planned_end, window_end) - max(s.planned_start, window_start)
            ).total_seconds()
            / 3600
            for s in slots
        )

        utilization = scheduled_hours / available_hours
        if utilization > 0.7:
            bottlenecks.append(
                {
                    "work_center_id": wc.id,
                    "work_center_name": wc.name,
                    "utilization_pct": round(utilization * 100, 1),
                    "scheduled_hours": round(scheduled_hours, 1),
                    "available_hours": round(available_hours, 1),
                }
            )

    return sorted(bottlenecks, key=lambda x: x["utilization_pct"], reverse=True)
