"""Company CRUD endpoints — M01 Onboarding."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_authenticated
from app.config import settings
from app.database import get_db
from app.models.companies import Company, CompanyContact
from app.schemas.auth import CurrentUser
from app.schemas.companies import (
    CompanyContactResponse,
    CompanyResponse,
    CompanySummaryResponse,
    CreateCompanyInput,
    UpdateCompanyStatusInput,
)

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanySummaryResponse])
async def list_companies(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_authenticated),
):
    """List all companies with primary contact info."""
    result = await db.execute(
        select(Company).order_by(Company.created_at.desc())
    )
    companies = result.scalars().all()

    summaries = []
    for c in companies:
        # Get primary contacts
        contacts_result = await db.execute(
            select(CompanyContact).where(
                CompanyContact.company_id == c.id,
                CompanyContact.is_primary.is_(True),
            )
        )
        contacts = contacts_result.scalars().all()
        count_result = await db.execute(
            select(func.count()).where(CompanyContact.company_id == c.id)
        )
        contact_count = count_result.scalar() or 0

        primary_email = next((ct.contact_value for ct in contacts if ct.contact_type == "email"), None)
        primary_phone = next((ct.contact_value for ct in contacts if ct.contact_type == "phone"), None)

        summaries.append(CompanySummaryResponse(
            id=c.id, tenant_id=c.tenant_id, rfc=c.rfc, legal_name=c.legal_name,
            trade_name=c.trade_name, business_activity=c.business_activity,
            status=c.status, primary_email=primary_email, primary_phone=primary_phone,
            contact_count=contact_count, created_at=c.created_at, updated_at=c.updated_at,
        ))
    return summaries


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get a single company by ID."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    return company


@router.get("/{company_id}/contacts", response_model=list[CompanyContactResponse])
async def get_company_contacts(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_authenticated),
):
    """Get contacts for a company."""
    result = await db.execute(
        select(CompanyContact)
        .where(CompanyContact.company_id == company_id)
        .order_by(CompanyContact.is_primary.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    body: CreateCompanyInput,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_authenticated),
):
    """Create a new company with contacts."""
    rfc = body.rfc.strip().upper().replace(" ", "")

    # Check RFC uniqueness within tenant
    existing = await db.execute(
        select(Company).where(Company.rfc == rfc, Company.tenant_id == settings.tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una empresa con RFC {rfc}",
        )

    company = Company(
        rfc=rfc,
        legal_name=body.legal_name.strip(),
        trade_name=body.trade_name.strip() if body.trade_name else None,
        business_activity=body.business_activity,
        tenant_id=settings.tenant_id,
    )
    db.add(company)
    await db.flush()

    # Add contacts
    contacts = [
        CompanyContact(
            company_id=company.id,
            contact_type="email",
            contact_value=body.contact_email.strip().lower(),
            contact_name=body.contact_name.strip() if body.contact_name else None,
            is_primary=True,
        )
    ]
    if body.contact_phone and body.contact_phone.strip():
        contacts.append(
            CompanyContact(
                company_id=company.id,
                contact_type="phone",
                contact_value=body.contact_phone.strip(),
                contact_name=body.contact_name.strip() if body.contact_name else None,
                is_primary=True,
            )
        )
    db.add_all(contacts)
    await db.flush()
    await db.refresh(company)
    return company


@router.patch("/{company_id}/status", response_model=CompanyResponse)
async def update_company_status(
    company_id: uuid.UUID,
    body: UpdateCompanyStatusInput,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_authenticated),
):
    """Update company status."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")

    company.status = body.status
    await db.flush()
    await db.refresh(company)
    return company


@router.get("/search/rfc/{rfc}", response_model=CompanyResponse | None)
async def find_company_by_rfc(
    rfc: str,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_authenticated),
):
    """Find a company by RFC."""
    normalized = rfc.strip().upper().replace(" ", "")
    result = await db.execute(
        select(Company).where(Company.rfc == normalized, Company.tenant_id == settings.tenant_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    return company
