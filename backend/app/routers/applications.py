"""Credit application endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models.applications import Application, ApplicationStatusLog
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/applications", tags=["applications"])


class CreateApplicationInput(BaseModel):
    rfc: str
    company_name: str
    requested_amount: float = Field(..., gt=0)
    term_months: int = Field(..., gt=0)
    currency: str = "MXN"


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    rfc: str
    company_name: str
    requested_amount: float
    term_months: int
    currency: str
    status: str
    scoring_version: str | None
    created_by: uuid.UUID | None
    created_at: str
    updated_at: str | None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ApplicationResponse])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(select(Application).order_by(Application.created_at.desc()))
    return result.scalars().all()


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(select(Application).where(Application.id == application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    return app


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    body: CreateApplicationInput,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    app = Application(
        rfc=body.rfc.strip().upper(),
        company_name=body.company_name.strip(),
        requested_amount=body.requested_amount,
        term_months=body.term_months,
        currency=body.currency,
        created_by=user.id,
    )
    db.add(app)
    await db.flush()
    await db.refresh(app)
    return app


@router.patch("/{application_id}/status")
async def update_application_status(
    application_id: uuid.UUID,
    new_status: str,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_admin),
):
    """Update application status with audit log."""
    valid_statuses = {
        "pending_scoring", "scoring_in_progress", "scored",
        "approved", "conditional", "committee", "rejected",
    }
    if new_status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status inválido: {new_status}")

    result = await db.execute(select(Application).where(Application.id == application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")

    old_status = app.status
    app.status = new_status

    # Log status change
    log = ApplicationStatusLog(
        application_id=application_id,
        old_status=old_status,
        new_status=new_status,
        changed_by=user.id,
        reason=reason,
    )
    db.add(log)
    await db.flush()
    return {"ok": True, "old_status": old_status, "new_status": new_status}
