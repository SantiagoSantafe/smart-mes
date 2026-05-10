from sqlalchemy.orm import Session

from app.models import MaterialPlanLine, Project, ProjectStateHistory

TRANSITIONS: dict[str, list[str]] = {
    "entrada_informacion": ["planos"],
    "planos": ["requisicion"],
    "requisicion": ["produccion"],
    "produccion": ["entrega"],
    "entrega": [],
}

STATE_LABELS: dict[str, str] = {
    "entrada_informacion": "Entrada de Información",
    "planos": "Planos",
    "requisicion": "Requisición",
    "produccion": "Producción",
    "entrega": "Entrega",
}

STATES_ORDERED = list(TRANSITIONS.keys())


class TransitionError(Exception):
    pass


class TransitionBlocked(Exception):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def _check_guards(project: Project, target_state: str, db: Session) -> None:
    if target_state == "produccion":
        if not project.material_plan:
            raise TransitionBlocked(
                "El proyecto no tiene un plan de materiales. "
                "Completa la etapa de Planos primero."
            )
        pending = (
            db.query(MaterialPlanLine)
            .filter(
                MaterialPlanLine.plan_id == project.material_plan.id,
                MaterialPlanLine.is_received.is_(False),
            )
            .count()
        )
        if pending > 0:
            raise TransitionBlocked(
                f"Hay {pending} material(es) pendiente(s) de recibir en Requisición. "
                "Marca todos como recibidos antes de iniciar Producción."
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
            f"No se puede pasar de '{STATE_LABELS.get(project.current_state, project.current_state)}' "
            f"a '{STATE_LABELS.get(target_state, target_state)}'."
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
