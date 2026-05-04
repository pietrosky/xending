"""Company schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CompanyAddress(BaseModel):
    street: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    country: str | None = None


class CreateCompanyInput(BaseModel):
    rfc: str = Field(..., min_length=12, max_length=13)
    legal_name: str = Field(..., min_length=1)
    trade_name: str | None = None
    business_activity: str
    contact_email: str
    contact_phone: str | None = None
    contact_name: str | None = None


class CompanyResponse(BaseModel):
    id: uuid.UUID
    tenant_id: str
    rfc: str
    legal_name: str
    trade_name: str | None
    business_activity: str | None
    tax_regime: str | None
    incorporation_date: datetime | None
    address: CompanyAddress | dict
    syntage_entity_id: str | None
    scory_entity_id: str | None
    status: Literal["active", "inactive", "blacklisted"]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanySummaryResponse(BaseModel):
    id: uuid.UUID
    tenant_id: str
    rfc: str
    legal_name: str
    trade_name: str | None
    business_activity: str | None
    status: str
    primary_email: str | None = None
    primary_phone: str | None = None
    contact_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyContactResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    contact_type: str
    contact_value: str
    contact_name: str | None
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateCompanyStatusInput(BaseModel):
    status: Literal["active", "inactive", "blacklisted"]
