from fastapi import APIRouter

from app.db import get_pool

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "raquel-ml-service", "version": "0.1.0"}


@router.get("/ready")
async def readiness():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"ready": True, "db": "connected"}
    except Exception as e:
        return {"ready": False, "error": str(e)}
