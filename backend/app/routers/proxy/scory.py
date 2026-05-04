"""Scory API proxy — replaces cs-scory-proxy edge function."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import require_authenticated
from app.schemas.auth import CurrentUser
from app.services.scory_client import scory_request

router = APIRouter(prefix="/proxy/scory", tags=["proxy-scory"])


class VerificationRequest(BaseModel):
    rfc: str
    legal_name: str
    check_types: list[str] = ["listas_negras", "syger", "rug", "peps", "ofac", "69b"]


@router.post("/verify")
async def verify_entity(
    body: VerificationRequest,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Run PLD/KYC verification checks via Scory."""
    return await scory_request("POST", "/verify", body.model_dump())


@router.get("/status/{verification_id}")
async def get_verification_status(
    verification_id: str,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get verification status from Scory."""
    return await scory_request("GET", f"/verifications/{verification_id}")
