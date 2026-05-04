"""Payment account endpoints (company CLABEs + PI accounts)."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models.payment_accounts import CompanyPaymentAccount, PIAccount
from app.schemas.auth import CurrentUser
from app.schemas.payment_accounts import (
    CompanyPaymentAccountResponse,
    CreateCompanyPaymentAccountInput,
    CreatePIAccountInput,
    PIAccountResponse,
)

router = APIRouter(tags=["payment-accounts"])


# ─── Company Payment Accounts (CLABEs) ───────────────────────────────

@router.get(
    "/companies/{company_id}/payment-accounts",
    response_model=list[CompanyPaymentAccountResponse],
)
async def list_company_payment_accounts(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(CompanyPaymentAccount)
        .where(CompanyPaymentAccount.company_id == company_id, CompanyPaymentAccount.deleted.is_(False))
        .order_by(CompanyPaymentAccount.created_at.desc())
    )
    return result.scalars().all()


@router.post(
    "/companies/{company_id}/payment-accounts",
    response_model=CompanyPaymentAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_payment_account(
    company_id: uuid.UUID,
    body: CreateCompanyPaymentAccountInput,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    account = CompanyPaymentAccount(
        company_id=company_id,
        clabe=body.clabe.replace("-", "").strip(),
        bank_name=body.bank_name,
        is_primary=body.is_primary,
        currency=body.currency,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


# ─── PI Accounts (Xending's own accounts) ────────────────────────────

@router.get("/pi-accounts", response_model=list[PIAccountResponse])
async def list_pi_accounts(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(
        select(PIAccount)
        .order_by(PIAccount.is_active.desc(), PIAccount.created_at.desc())
    )
    return result.scalars().all()


@router.post("/pi-accounts", response_model=PIAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_pi_account(
    body: CreatePIAccountInput,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_admin),
):
    # Check for duplicate account number
    existing = await db.execute(
        select(PIAccount).where(PIAccount.account_number == body.account_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con este número de cuenta",
        )

    account = PIAccount(
        account_number=body.account_number,
        account_name=body.account_name,
        swift_code=body.swift_code.strip() if body.swift_code else None,
        bank_name=body.bank_name,
        bank_address=body.bank_address,
        currency_types=body.currency_types,
        created_by=user.id,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


@router.get("/pi-accounts/{account_id}", response_model=PIAccountResponse)
async def get_pi_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(select(PIAccount).where(PIAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")
    return account


@router.post("/pi-accounts/{account_id}/disable")
async def disable_pi_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_admin),
):
    result = await db.execute(select(PIAccount).where(PIAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada")

    account.is_active = False
    account.disabled_at = datetime.now(timezone.utc)
    account.disabled_by = user.id
    await db.flush()
    return {"ok": True}
