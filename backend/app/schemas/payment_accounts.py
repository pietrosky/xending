"""Payment account schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CreateCompanyPaymentAccountInput(BaseModel):
    company_id: uuid.UUID
    clabe: str = Field(..., min_length=18, max_length=18)
    bank_name: str | None = None
    is_primary: bool = False
    currency: str | None = None


class CompanyPaymentAccountResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    clabe: str
    bank_name: str | None
    is_primary: bool
    deleted: bool
    currency: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreatePIAccountInput(BaseModel):
    account_number: str
    account_name: str
    swift_code: str | None = None
    bank_name: str
    bank_address: str | None = None
    currency_types: list[str] = Field(default_factory=list)


class PIAccountResponse(BaseModel):
    id: uuid.UUID
    account_number: str
    account_name: str
    swift_code: str | None
    bank_name: str
    bank_address: str | None
    currency_types: list[str]
    is_active: bool
    disabled_at: datetime | None
    disabled_by: uuid.UUID | None
    created_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
