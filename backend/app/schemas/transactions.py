"""FX Transaction schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CreateTransactionInput(BaseModel):
    company_id: uuid.UUID
    payment_account_id: uuid.UUID | None = None
    pi_account_id: uuid.UUID | None = None
    buys_currency: Literal["USD", "MXN"] = "USD"
    quantity: float = Field(..., gt=0)
    base_rate: float | None = None
    markup_rate: float = Field(..., gt=0)
    pays_currency: Literal["USD", "MXN"] = "MXN"


class UpdateTransactionInput(BaseModel):
    quantity: float | None = Field(None, gt=0)
    base_rate: float | None = None
    markup_rate: float | None = Field(None, gt=0)
    company_id: uuid.UUID | None = None
    payment_account_id: uuid.UUID | None = None
    pi_account_id: uuid.UUID | None = None
    buys_currency: Literal["USD", "MXN"] | None = None
    pays_currency: Literal["USD", "MXN"] | None = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    folio: str
    company_id: uuid.UUID
    quantity: float
    base_rate: float | None
    markup_rate: float
    buys_currency: str
    pays_currency: str
    status: str
    payment_account_id: uuid.UUID | None
    pi_account_id: uuid.UUID | None
    created_by: uuid.UUID
    authorized_by: uuid.UUID | None
    authorized_at: datetime | None
    proof_url: str | None
    cancelled: bool
    cancelled_at: datetime | None
    cancelled_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionSummaryResponse(TransactionResponse):
    company_legal_name: str = ""
    company_rfc: str = ""
    broker_name: str | None = None
    authorized_by_name: str | None = None


class TransactionGroupsResponse(BaseModel):
    no_autorizadas: list[TransactionSummaryResponse]
    autorizadas_sin_comprobante: list[TransactionSummaryResponse]
    historial: list[TransactionSummaryResponse]
