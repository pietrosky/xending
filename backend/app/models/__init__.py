"""SQLAlchemy ORM models — mirrors the PostgreSQL schema from Supabase migrations."""

from app.models.companies import Company, CompanyContact
from app.models.applications import Application, ApplicationStatusLog
from app.models.transactions import FXTransaction
from app.models.payment_accounts import CompanyPaymentAccount, PIAccount
from app.models.compliance import ComplianceCheck, ComplianceResult
from app.models.sat import (
    SATData, SATMetrics, SATResult,
    SATRevenueQuality, SATPaymentBehavior,
    SATFacturadoVsDeclarado, SATBlacklistedInvoices,
    SATProductDiversification,
)
from app.models.financial import (
    FinancialInput, FinancialCalculation, FinancialResult,
    FinancialBalanceDetail, FinancialIncomeDetail,
    FinancialRelatedParties, FinancialBalanza,
)
from app.models.network import (
    NetworkCounterparty, NetworkMetrics, NetworkConcentration,
    NetworkResult,
)
from app.models.expedientes import Expediente, ExpedienteToken, ExpedienteEvent
from app.models.profiles import Profile

__all__ = [
    "Company", "CompanyContact",
    "Application", "ApplicationStatusLog",
    "FXTransaction",
    "CompanyPaymentAccount", "PIAccount",
    "ComplianceCheck", "ComplianceResult",
    "SATData", "SATMetrics", "SATResult",
    "SATRevenueQuality", "SATPaymentBehavior",
    "SATFacturadoVsDeclarado", "SATBlacklistedInvoices",
    "SATProductDiversification",
    "FinancialInput", "FinancialCalculation", "FinancialResult",
    "FinancialBalanceDetail", "FinancialIncomeDetail",
    "FinancialRelatedParties", "FinancialBalanza",
    "NetworkCounterparty", "NetworkMetrics", "NetworkConcentration",
    "NetworkResult",
    "Expediente", "ExpedienteToken", "ExpedienteEvent",
    "Profile",
]
