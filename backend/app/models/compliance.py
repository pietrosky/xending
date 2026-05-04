"""Compliance engine models (Scory PLD/KYC gate)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ComplianceCheck(Base):
    __tablename__ = "cs_compliance_checks"
    __table_args__ = (Index("idx_cs_compliance_checks_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    check_type: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)  # pass | fail | review_required
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ComplianceResult(Base):
    __tablename__ = "cs_compliance_results"
    __table_args__ = (Index("idx_cs_compliance_results_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    overall_status: Mapped[str] = mapped_column(Text, nullable=False)
    risk_flags: Mapped[list] = mapped_column(JSONB, default=list)
    blocking_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    scory_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
