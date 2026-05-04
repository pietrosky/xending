"""Network engine models (client/supplier concentration)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NetworkCounterparty(Base):
    __tablename__ = "cs_network_counterparties"
    __table_args__ = (Index("idx_cs_net_counterparties_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    counterparty_type: Mapped[str] = mapped_column(Text, nullable=False)  # client | supplier
    rfc: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    revenue_share: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NetworkMetrics(Base):
    __tablename__ = "cs_network_metrics"
    __table_args__ = (Index("idx_cs_net_metrics_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    metric_name: Mapped[str] = mapped_column(Text, nullable=False)
    metric_value: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    period: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NetworkConcentration(Base):
    __tablename__ = "cs_network_concentration"
    __table_args__ = (Index("idx_cs_net_concentration_app", "application_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_applications.id", ondelete="CASCADE"), nullable=False
    )
    concentration_type: Mapped[str] = mapped_column(Text, nullable=False)
    hhi: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    top1_percent: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    top3_percent: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    analysis_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NetworkResult(Base):
    __tablename__ = "cs_network_results"
    __table_args__ = (Index("idx_cs_net_results_app", "application_id"),)

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
