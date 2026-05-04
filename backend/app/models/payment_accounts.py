"""Payment account models (company CLABE + PI accounts)."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CompanyPaymentAccount(Base):
    __tablename__ = "cs_company_payment_accounts"
    __table_args__ = (Index("idx_payment_accounts_company", "company_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_companies.id", ondelete="CASCADE"), nullable=False
    )
    clabe: Mapped[str] = mapped_column(Text, nullable=False)
    bank_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PIAccount(Base):
    """Payment Instruction accounts (Xending's own bank accounts for receiving funds)."""
    __tablename__ = "pi_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    account_name: Mapped[str] = mapped_column(Text, nullable=False)
    swift_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    bank_name: Mapped[str] = mapped_column(Text, nullable=False)
    bank_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    currency_types: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    disabled_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
