"""FastAPI application entry point — Xending Capital Backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, applications, companies, payment_accounts, scoring, transactions
from app.routers.proxy import syntage, scory

app = FastAPI(
    title="Xending Capital API",
    description="Credit Scoring & FX Platform Backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(payment_accounts.router, prefix="/api")
app.include_router(scoring.router, prefix="/api")
app.include_router(syntage.router, prefix="/api")
app.include_router(scory.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "xending-backend"}
