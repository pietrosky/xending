"""Syntage API HTTP client — async with retry logic."""

import httpx

from app.config import settings

MAX_RETRIES = 3
RETRY_DELAY_S = 1.0


async def syntage_request(
    method: str,
    path: str,
    body: dict | None = None,
    params: dict | None = None,
) -> dict:
    """Make an authenticated request to the Syntage API with retry."""
    url = f"{settings.syntage_api_url}{path}"
    headers = {
        "Accept": "application/ld+json",
        "Content-Type": "application/json",
        "X-API-Key": settings.syntage_api_key,
        "Accept-Version": settings.syntage_api_version,
    }

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=body,
                    params=params,
                )
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPStatusError, httpx.RequestError) as e:
            last_error = e
            if attempt < MAX_RETRIES:
                import asyncio
                await asyncio.sleep(RETRY_DELAY_S * attempt)

    raise last_error or Exception("Syntage request failed")
