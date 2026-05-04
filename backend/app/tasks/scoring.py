"""Scoring orchestration Celery tasks — replaces cs-orchestrator edge function."""

from app.tasks import celery_app

# Engine dependency phases (executed sequentially, engines within a phase run in parallel)
ENGINE_PHASES: list[list[str]] = [
    ["compliance"],                                          # Phase 0: Gate
    ["sat_facturacion", "buro", "documentation"],           # Phase 1: Data-independent
    ["financial", "network", "employee", "cashflow"],       # Phase 2: Depends on Phase 1
    ["working_capital", "stability", "operational", "fx_risk"],  # Phase 3: Depends on Phase 2
    ["guarantee"],                                          # Phase 4: Score context
    ["benchmark", "portfolio", "graph_fraud"],              # Phase 5: Cross-cutting
]


@celery_app.task(name="scoring.run_full_scoring")
def run_scoring_task(application_id: str) -> dict:
    """
    Run the full scoring orchestration for an application.

    Executes engines in dependency phases. If compliance (Phase 0) fails,
    the entire scoring is blocked.

    This is a placeholder — each engine's logic lives in the frontend
    TypeScript engines and needs to be ported to Python.
    """
    # TODO: Implement engine execution logic
    # 1. For each phase, run engines in parallel
    # 2. Store results in cs_*_results tables
    # 3. If compliance fails → block all subsequent phases
    # 4. Calculate consolidated score from weighted engines
    # 5. Update application status (scored/approved/rejected/committee)
    # 6. Log to cs_audit_log

    return {
        "application_id": application_id,
        "status": "completed",
        "engines_completed": [],
        "engines_failed": [],
        "message": "Scoring task placeholder — implement engine logic",
    }
