"""
Startup migrations — adds missing columns / tables without losing data.
Safe to run on every startup (idempotent via IF NOT EXISTS).
"""
import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def run(engine: Engine) -> None:
    stmts = [
        # projects — columns that may be missing on old DBs
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(200) NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_number VARCHAR(100) NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) NOT NULL DEFAULT 'metalmecanica'",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_state VARCHAR(50) NOT NULL DEFAULT 'entrada_informacion'",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date TIMESTAMP",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS fcs_delivery_date TIMESTAMP",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()",

        # project_state_history
        """
        CREATE TABLE IF NOT EXISTS project_state_history (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            from_state VARCHAR(50),
            to_state VARCHAR(50) NOT NULL,
            reason TEXT,
            changed_at TIMESTAMP DEFAULT now()
        )
        """,

        # material_plans
        """
        CREATE TABLE IF NOT EXISTS material_plans (
            id SERIAL PRIMARY KEY,
            project_id INTEGER UNIQUE REFERENCES projects(id),
            notes TEXT,
            created_at TIMESTAMP DEFAULT now()
        )
        """,

        # material_plan_lines
        """
        CREATE TABLE IF NOT EXISTS material_plan_lines (
            id SERIAL PRIMARY KEY,
            plan_id INTEGER REFERENCES material_plans(id),
            material_type VARCHAR(100) NOT NULL,
            description VARCHAR(300) NOT NULL,
            quantity FLOAT NOT NULL,
            unit VARCHAR(20) DEFAULT 'und',
            supplier_name VARCHAR(200) DEFAULT '',
            is_received BOOLEAN DEFAULT FALSE,
            received_at TIMESTAMP,
            notes TEXT
        )
        """,

        # work_centers
        """
        CREATE TABLE IF NOT EXISTS work_centers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            hours_per_day FLOAT DEFAULT 8.0,
            work_start_hour INTEGER DEFAULT 8,
            is_active BOOLEAN DEFAULT TRUE
        )
        """,

        # process_routes
        """
        CREATE TABLE IF NOT EXISTS process_routes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            project_type VARCHAR(50) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE
        )
        """,

        # route_steps
        """
        CREATE TABLE IF NOT EXISTS route_steps (
            id SERIAL PRIMARY KEY,
            route_id INTEGER REFERENCES process_routes(id),
            work_center_id INTEGER REFERENCES work_centers(id),
            step_order INTEGER NOT NULL,
            name VARCHAR(200) NOT NULL,
            estimated_hours FLOAT NOT NULL,
            can_parallel BOOLEAN DEFAULT FALSE,
            depends_on_step_id INTEGER REFERENCES route_steps(id)
        )
        """,

        # fcs_schedule_slots
        """
        CREATE TABLE IF NOT EXISTS fcs_schedule_slots (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id),
            work_center_id INTEGER REFERENCES work_centers(id),
            route_step_id INTEGER REFERENCES route_steps(id),
            step_name VARCHAR(200) NOT NULL,
            planned_start TIMESTAMP NOT NULL,
            planned_end TIMESTAMP NOT NULL,
            actual_start TIMESTAMP,
            actual_end TIMESTAMP,
            is_manual BOOLEAN DEFAULT FALSE,
            status VARCHAR(20) DEFAULT 'planned'
        )
        """,
    ]

    with engine.begin() as conn:
        for stmt in stmts:
            try:
                conn.execute(text(stmt.strip()))
            except Exception as e:
                logger.warning("Migration stmt skipped: %s", e)
