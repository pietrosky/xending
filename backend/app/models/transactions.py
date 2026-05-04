"""FX Transaction model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FXTransaction(Base):
    __tablename__ = "fx_transactions"
    __table_args__ = (
        Index("idx_fx_transactions_company", "company_id"),
        Index("idx_fx_transactions_status", "status"),
        Index("idx_fx_transactions_created_by", "created_by"),
        Index("idx_fx_transactions_pi_account", "pi_account_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    folio: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    base_rate: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    markup_rate: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    buys_currency: Mapped[str] = mapped_column(String(3), default="USD")
    pays_currency: Mapped[str] = mapped_column(String(3), default="MXN")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | authorized | completed
    payment_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    pi_account_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    authorized_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    authorized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    proof_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled: Mapped[bool] = mapped_column(Boolean, default=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
