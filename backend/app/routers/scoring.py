"""Scoring orchestration endpoints — replaces cs-orchestrator edge function."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.database import get_db
from app.models.applications import Application
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/scoring", tags=["scoring"])


@router.post("/run/{application_id}")
async def run_scoring(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_admin),
):
    """
    Trigger the full scoring orchestration for an application.
    Runs engines in dependency phases (compliance → SAT/Buro → financial → etc.)
    """
    result = await db.execute(select(Application).where(Application.id == application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")

    if app.status not in ("pending_scoring", "scoring_in_progress"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede iniciar scoring: status actual es '{app.status}'",
        )

    # Update status to scoring_in_progress
    app.status = "scoring_in_progress"
    await db.flush()

    # TODO: Dispatch Celery task for async scoring orchestration
    # from app.tasks.scoring import run_scoring_task
    # run_scoring_task.delay(str(application_id))

    return {
        "application_id": str(application_id),
        "status": "scoring_in_progress",
        "message": "Scoring iniciado. Los resultados se actualizarán asíncronamente.",
    }


@router.get("/results/{application_id}")
async def get_scoring_results(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_admin),
):
    """Get all scoring engine results for an application."""
    from app.models.compliance import ComplianceResult
    from app.models.sat import SATResult
    from app.models.financial import FinancialResult
    from app.models.network import NetworkResult

    results = {}

    for model, key in [
        (ComplianceResult, "compliance"),
        (SATResult, "sat"),
        (FinancialResult, "financial"),
        (NetworkResult, "network"),
    ]:
        r = await db.execute(
            select(model).where(model.application_id == application_id)
            .order_by(model.created_at.desc()).limit(1)
        )
        row = r.scalar_one_or_none()
        if row:
            results[key] = {
                "module_status": row.module_status,
                "module_score": float(row.module_score),
                "module_grade": row.module_grade,
                "risk_flags": row.risk_flags,
                "key_metrics": row.key_metrics,
            }

    return {"application_id": str(application_id), "engines": results}
