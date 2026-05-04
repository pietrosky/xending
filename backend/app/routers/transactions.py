"""FX Transaction endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models.companies import Company
from app.models.profiles import Profile
from app.models.transactions import FXTransaction
from app.schemas.auth import CurrentUser
from app.schemas.transactions import (
    CreateTransactionInput,
    TransactionGroupsResponse,
    TransactionResponse,
    TransactionSummaryResponse,
    UpdateTransactionInput,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _generate_folio() -> str:
    """Generate a folio like XG-25-0001. In production, use a DB sequence."""
    import random
    year = datetime.now(timezone.utc).strftime("%y")
    seq = random.randint(1, 9999)
    return f"XG-{year}-{seq:04d}"


@router.get("", response_model=list[TransactionSummaryResponse])
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """List FX transactions. Brokers see only their own; admins see all."""
    query = select(FXTransaction).order_by(FXTransaction.created_at.desc())
    if user.role == "broker":
        query = query.where(FXTransaction.created_by == user.id)

    result = await db.execute(query)
    transactions = result.scalars().all()

    # Resolve company names and user names
    company_ids = list({tx.company_id for tx in transactions})
    user_ids = list({tx.created_by for tx in transactions} | {tx.authorized_by for tx in transactions if tx.authorized_by})

    company_map: dict[uuid.UUID, tuple[str, str]] = {}
    if company_ids:
        companies = await db.execute(select(Company).where(Company.id.in_(company_ids)))
        for c in companies.scalars():
            company_map[c.id] = (c.legal_name, c.rfc)

    user_map: dict[uuid.UUID, str] = {}
    if user_ids:
        profiles = await db.execute(select(Profile).where(Profile.id.in_(user_ids)))
        for p in profiles.scalars():
            user_map[p.id] = p.full_name or p.email

    summaries = []
    for tx in transactions:
        co = company_map.get(tx.company_id, ("Empresa desconocida", ""))
        summaries.append(TransactionSummaryResponse(
            **{k: getattr(tx, k) for k in TransactionResponse.model_fields},
            company_legal_name=co[0],
            company_rfc=co[1],
            broker_name=user_map.get(tx.created_by),
            authorized_by_name=user_map.get(tx.authorized_by) if tx.authorized_by else None,
        ))
    return summaries


@router.get("/grouped", response_model=TransactionGroupsResponse)
async def get_grouped_transactions(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Get transactions grouped by status."""
    all_txs = await list_transactions(db=db, user=user)
    no_autorizadas = [tx for tx in all_txs if not tx.cancelled and tx.status == "pending"]
    autorizadas = [tx for tx in all_txs if not tx.cancelled and tx.status == "authorized"]
    historial = [tx for tx in all_txs if tx.cancelled or tx.status == "completed"]
    return TransactionGroupsResponse(
        no_autorizadas=no_autorizadas,
        autorizadas_sin_comprobante=autorizadas,
        historial=historial,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    """Get a single transaction by ID."""
    result = await db.execute(select(FXTransaction).where(FXTransaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no encontrada")
    return tx


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: CreateTransactionInput,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Create a new FX transaction."""
    if user.role != "admin" and body.markup_rate < (body.base_rate or 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los brokers no pueden aplicar markup negativo",
        )

    tx = FXTransaction(
        folio=_generate_folio(),
        company_id=body.company_id,
        buys_currency=body.buys_currency,
        quantity=body.quantity,
        base_rate=body.base_rate,
        markup_rate=body.markup_rate,
        pays_currency=body.pays_currency,
        payment_account_id=body.payment_account_id,
        pi_account_id=body.pi_account_id,
        created_by=user.id,
    )
    db.add(tx)
    await db.flush()
    await db.refresh(tx)
    return tx


@router.post("/{transaction_id}/authorize", response_model=TransactionResponse)
async def authorize_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(require_admin),
):
    """Authorize a pending transaction (admin only)."""
    result = await db.execute(select(FXTransaction).where(FXTransaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no encontrada")
    if tx.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede autorizar: status actual es '{tx.status}', se esperaba 'pending'",
        )

    tx.status = "authorized"
    tx.authorized_by = user.id
    tx.authorized_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(tx)
    return tx


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: uuid.UUID,
    body: UpdateTransactionInput,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Update a transaction. Brokers can only edit pending transactions."""
    result = await db.execute(select(FXTransaction).where(FXTransaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no encontrada")

    if user.role != "admin" and tx.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo se pueden editar transacciones pendientes",
        )

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(tx, field, value)
    tx.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(tx)
    return tx


@router.post("/{transaction_id}/cancel", response_model=TransactionResponse)
async def cancel_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Cancel a transaction (soft delete)."""
    result = await db.execute(select(FXTransaction).where(FXTransaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no encontrada")
    if tx.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La transacción ya está cancelada")

    if user.role == "broker":
        if tx.status != "pending":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes cancelar transacciones pendientes")
        if tx.created_by != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes cancelar tus propias transacciones")

    tx.cancelled = True
    tx.cancelled_at = datetime.now(timezone.utc)
    tx.cancelled_by = user.id
    await db.flush()
    await db.refresh(tx)
    return tx


@router.post("/{transaction_id}/revert-cancel", response_model=TransactionResponse)
async def revert_cancel_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_admin),
):
    """Revert a cancellation (admin only)."""
    result = await db.execute(select(FXTransaction).where(FXTransaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no encontrada")

    tx.cancelled = False
    tx.cancelled_at = None
    tx.cancelled_by = None
    await db.flush()
    await db.refresh(tx)
    return tx
