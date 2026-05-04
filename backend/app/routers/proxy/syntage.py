"""Syntage API proxy — replaces cs-syntage-proxy edge function."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import require_authenticated
from app.schemas.auth import CurrentUser
from app.services.syntage_client import syntage_request

router = APIRouter(prefix="/proxy/syntage", tags=["proxy-syntage"])


class EntityCreateRequest(BaseModel):
    type: str = "company"
    name: str
    taxpayer: dict  # { rfc: str }
    tags: list[str] = []


class CredentialCreateRequest(BaseModel):
    entity: str  # /entities/{id}
    rfc: str
    password: str


class ExtractionCreateRequest(BaseModel):
    entity: str
    type: str  # invoice, annual_tax_return, etc.


@router.post("/entities")
async def create_entity(
    body: EntityCreateRequest,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Create an entity in Syntage."""
    return await syntage_request("POST", "/entities", body.model_dump())


@router.get("/entities/{entity_id}")
async def get_entity(
    entity_id: str,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get entity details from Syntage."""
    return await syntage_request("GET", f"/entities/{entity_id}")


@router.post("/credentials")
async def create_credential(
    body: CredentialCreateRequest,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Create a CIEC credential in Syntage."""
    return await syntage_request("POST", "/credentials", body.model_dump())


@router.post("/extractions")
async def create_extraction(
    body: ExtractionCreateRequest,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Start a data extraction in Syntage."""
    return await syntage_request("POST", "/extractions", body.model_dump())


@router.get("/extractions/{extraction_id}")
async def get_extraction(
    extraction_id: str,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get extraction status from Syntage."""
    return await syntage_request("GET", f"/extractions/{extraction_id}")


@router.get("/entities/{entity_id}/invoices")
async def get_invoices(
    entity_id: str,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get invoices for an entity."""
    return await syntage_request("GET", f"/entities/{entity_id}/invoices")


@router.get("/entities/{entity_id}/tax-returns")
async def get_tax_returns(
    entity_id: str,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get tax returns for an entity."""
    return await syntage_request("GET", f"/entities/{entity_id}/tax_returns")


@router.get("/entities/{entity_id}/tax-status")
async def get_tax_status(
    entity_id: str,
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get tax status (constancia fiscal) for an entity."""
    return await syntage_request("GET", f"/entities/{entity_id}/tax_status")
