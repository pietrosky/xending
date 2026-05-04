"""Financial engine models."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FinancialInput(Base):
    __tablename__ = "cs_financial_inputs"
    __table_args__ = (Index("idx_cs_fin_inputs_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    source: Mapped[str] = mapped_column(Text, nullable=False)  # syntage | manual | both
    fiscal_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinancialCalculation(Base):
    __tablename__ = "cs_financial_calculations"
    __table_args__ = (Index("idx_cs_fin_calc_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    metric_name: Mapped[str] = mapped_column(Text, nullable=False)
    metric_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    period: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinancialResult(Base):
    __tablename__ = "cs_financial_results"
    __table_args__ = (Index("idx_cs_fin_results_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    module_status: Mapped[str] = mapped_column(Text, nullable=False)
    module_score: Mapped[float] = mapped_column(Numeric, nullable=False)
    module_grade: Mapped[str] = mapped_column(Text, nullable=False)
    risk_flags: Mapped[list] = mapped_column(JSONB, default=list)
    key_metrics: Mapped[dict] = mapped_column(JSONB, default=dict)
    benchmark_comparison: Mapped[dict] = mapped_column(JSONB, default=dict)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_actions: Mapped[list] = mapped_column(JSONB, default=list)
    trend_factor: Mapped[float] = mapped_column(Numeric, nullable=False, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinancialBalanceDetail(Base):
    __tablename__ = "cs_financial_balance_detail"
    __table_args__ = (Index("idx_cs_fin_balance_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinancialIncomeDetail(Base):
    __tablename__ = "cs_financial_income_detail"
    __table_args__ = (Index("idx_cs_fin_income_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    income_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinancialRelatedParties(Base):
    __tablename__ = "cs_financial_related_parties"
    __table_args__ = (Index("idx_cs_fin_rp_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    rp_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    total_exposure_percent: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinancialBalanza(Base):
    __tablename__ = "cs_financial_balanza"
    __table_args__ = (Index("idx_cs_fin_balanza_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    period: Mapped[str] = mapped_column(Text, nullable=False)
    balanza_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
