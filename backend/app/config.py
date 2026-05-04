"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:55432/postgres"

    # Auth
    jwt_secret: str = "super-secret-jwt-token-with-at-least-32-characters-long"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # External APIs
    syntage_api_url: str = "https://api.sandbox.syntage.com"
    syntage_api_key: str = ""
    syntage_api_version: str = "2024-01-01"
    scory_api_url: str = "https://api.scory.ai"
    scory_api_key: str = ""

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "soporte@xending.com"

    # PDF
    pdf_generator_url: str = "http://localhost:3002"

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    tenant_id: str = "xending"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
