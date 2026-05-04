# Xending Capital — FastAPI Backend

Replaces the Supabase/PostgREST + Deno Edge Functions layer with a Python FastAPI application.

## Tech Stack

- **Runtime**: Python 3.12+
- **Framework**: FastAPI 0.115+
- **ORM**: SQLAlchemy 2.0 (async) + asyncpg
- **Migrations**: Alembic
- **Auth**: JWT (PyJWT) with role-based access (admin/broker)
- **Validation**: Pydantic v2
- **Task Queue**: Celery + Redis (for scoring orchestration & polling)
- **External APIs**: httpx (async HTTP client for Syntage/Scory)
- **PDF**: WeasyPrint or reportlab (payment orders)
- **Email**: aiosmtplib (async SMTP)

## Project Structure

```
backend/
├── alembic/                 # Database migrations
│   └── versions/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings (env vars)
│   ├── database.py          # SQLAlchemy engine + session
│   ├── dependencies.py      # Shared FastAPI dependencies
│   ├── auth/                # JWT auth, role guards
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # API route handlers
│   │   ├── companies.py
│   │   ├── transactions.py
│   │   ├── applications.py
│   │   ├── expedientes.py
│   │   ├── payment_accounts.py
│   │   ├── scoring.py
│   │   └── proxy/           # External API proxies (Syntage, Scory)
│   ├── services/            # Business logic
│   │   ├── company_service.py
│   │   ├── transaction_service.py
│   │   ├── scoring_orchestrator.py
│   │   ├── syntage_orchestrator.py
│   │   ├── email_service.py
│   │   └── token_service.py
│   └── tasks/               # Celery async tasks
│       ├── scoring.py
│       └── syntage_polling.py
├── tests/
├── alembic.ini
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Quick Start

```bash
# Install dependencies
pip install -e ".[dev]"

# Set up environment
cp .env.example .env
# Edit .env with your database URL, secrets, etc.

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (for scoring tasks)
celery -A app.tasks worker --loglevel=info
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
