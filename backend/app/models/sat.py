"""SAT/Facturacion engine models (Syntage data)."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SATData(Base):
    __tablename__ = "cs_sat_data"
    __table_args__ = (
        Index("idx_cs_sat_data_app", "application_id"),
        Index("idx_cs_sat_data_type", "application_id", "data_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    data_type: Mapped[str] = mapped_column(Text, nullable=False)
    raw_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    period: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SATMetrics(Base):
    __tablename__ = "cs_sat_metrics"
    __table_args__ = (
        Index("idx_cs_sat_metrics_app", "application_id"),
        Index("idx_cs_sat_metrics_name", "application_id", "metric_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    metric_name: Mapped[str] = mapped_column(Text, nullable=False)
    metric_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    period: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SATResult(Base):
    __tablename__ = "cs_sat_results"
    __table_args__ = (Index("idx_cs_sat_results_app", "application_id"),)

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


class SATRevenueQuality(Base):
    __tablename__ = "cs_sat_revenue_quality"
    __table_args__ = (Index("idx_cs_sat_revenue_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    period: Mapped[str] = mapped_column(Text, nullable=False)
    gross_revenue: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    cancellations: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    credit_notes: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    discounts: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    net_revenue: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    cancellation_ratio: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    credit_note_ratio: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SATPaymentBehavior(Base):
    __tablename__ = "cs_sat_payment_behavior"
    __table_args__ = (Index("idx_cs_sat_payment_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    period: Mapped[str] = mapped_column(Text, nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)  # emitidas | recibidas
    total_pue: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    total_ppd: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    ppd_collected: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    ppd_collection_ratio: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    dso_days: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    dpo_days: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SATFacturadoVsDeclarado(Base):
    __tablename__ = "cs_sat_facturado_vs_declarado"
    __table_args__ = (Index("idx_cs_sat_fvd_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_facturado: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    total_declarado: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    discrepancy_amount: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    discrepancy_percent: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SATBlacklistedInvoices(Base):
    __tablename__ = "cs_sat_blacklisted_invoices"
    __table_args__ = (Index("idx_cs_sat_blacklist_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    counterparty_rfc: Mapped[str] = mapped_column(Text, nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)
    total_amount: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    invoice_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    list_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SATProductDiversification(Base):
    __tablename__ = "cs_sat_product_diversification"
    __table_args__ = (Index("idx_cs_sat_product_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    product_service_key: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_amount: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    weight_percent: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
