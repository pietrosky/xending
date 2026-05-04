"""Auth schemas."""

import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "CurrentUser"


class CurrentUser(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: Literal["admin", "broker"]
