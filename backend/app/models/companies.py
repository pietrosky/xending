"""Company and CompanyContact models — M01 Onboarding."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Company(Base):
    __tablename__ = "cs_companies"
    __table_args__ = (
        UniqueConstraint("tenant_id", "rfc", name="uq_cs_companies_tenant_rfc"),
        Index("idx_cs_companies_tenant", "tenant_id"),
        Index("idx_cs_companies_rfc", "rfc"),
        Index("idx_cs_companies_status", "status"),
        Index("idx_cs_companies_activity", "business_activity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(Text, nullable=False, default="xending")
    rfc: Mapped[str] = mapped_column(Text, nullable=False)
    legal_name: Mapped[str] = mapped_column(Text, nullable=False)
    trade_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_activity: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_regime: Mapped[str | None] = mapped_column(Text, nullable=True)
    incorporation_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    address: Mapped[dict] = mapped_column(JSONB, default=dict)
    syntage_entity_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    scory_entity_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # active | inactive | blacklisted
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    contacts: Mapped[list["CompanyContact"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class CompanyContact(Base):
    __tablename__ = "cs_company_contacts"
    __table_args__ = (
        Index("idx_cs_contacts_company", "company_id"),
        Index("idx_cs_contacts_type", "contact_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cs_companies.id", ondelete="CASCADE"), nullable=False
    )
    contact_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # email | phone | legal_rep | admin | billing
    contact_value: Mapped[str] = mapped_column(Text, nullable=False)
    contact_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped["Company"] = relationship(back_populates="contacts")
