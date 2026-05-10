from sqlalchemy.orm import Session

from app.models import POLine, Project, ProjectStateHistory

TRANSITIONS: dict[str, list[str]] = {
    "commercial_order": ["production_board"],
    "production_board": ["blueprints_review"],
    "blueprints_review": ["purchasing"],
    "purchasing": ["materials_received"],
    "materials_received": ["production"],
    "production": ["quality_check"],
    "quality_check": ["logistics", "production"],
    "logistics": ["delivered"],
    "delivered": [],
}

STATE_LABELS: dict[str, str] = {
    "commercial_order": "Orden Comercial",
    "production_board": "Junta de Producción",
    "blueprints_review": "Revisión de Planos",
    "purchasing": "Compras",
    "materials_received": "Materiales Recibidos",
    "production": "Producción",
    "quality_check": "Control de Calidad",
    "logistics": "Logística",
    "delivered": "Entregado",
}


class TransitionError(Exception):
    pass


class TransitionBlocked(Exception):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def _check_guards(project: Project, target_state: str, db: Session) -> None:
    if target_state == "production":
        pending = (
            db.query(POLine)
            .join(POLine.purchase_order)
            .filter(
                POLine.purchase_order.has(project_id=project.id),
                POLine.is_critical.is_(True),
                POLine.status.notin_(["received"]),
            )
            .count()
        )
        if pending > 0:
            raise TransitionBlocked(
                f"Hay {pending} línea(s) de materiales críticos pendientes de recibir. "
                "Actualiza el estado en Compras antes de iniciar Producción."
            )


def transition_project(
    project: Project,
    target_state: str,
    db: Session,
    reason: str | None = None,
) -> Project:
    allowed = TRANSITIONS.get(project.current_state, [])
    if target_state not in allowed:
        raise TransitionError(
            f"No se puede pasar de '{project.current_state}' a '{target_state}'. "
            f"Transiciones válidas: {allowed}"
        )

    _check_guards(project, target_state, db)

    history = ProjectStateHistory(
        project_id=project.id,
        from_state=project.current_state,
        to_state=target_state,
        reason=reason,
    )
    db.add(history)

    project.current_state = target_state
    db.commit()
    db.refresh(project)
    return project
