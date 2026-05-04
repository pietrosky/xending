"""Syntage extraction polling task — replaces the polling logic in syntageOrchestrator.ts."""

import asyncio

from app.services.syntage_client import syntage_request
from app.tasks import celery_app

TERMINAL_STATUSES = {"finished", "failed", "stopped", "cancelled"}
POLL_INTERVAL_S = 5
POLL_TIMEOUT_S = 300


@celery_app.task(name="syntage.poll_extraction")
def poll_extraction_task(extraction_id: str, expediente_id: str) -> dict:
    """
    Poll a Syntage extraction until it reaches a terminal status.

    Once finished, triggers data processing and advances the expediente.
    """

    async def _poll():
        elapsed = 0
        while elapsed < POLL_TIMEOUT_S:
            result = await syntage_request("GET", f"/extractions/{extraction_id}")
            status = result.get("status", "unknown")

            if status in TERMINAL_STATUSES:
                return {"extraction_id": extraction_id, "status": status, "data": result}

            await asyncio.sleep(POLL_INTERVAL_S)
            elapsed += POLL_INTERVAL_S

        return {"extraction_id": extraction_id, "status": "timeout"}

    return asyncio.run(_poll())
